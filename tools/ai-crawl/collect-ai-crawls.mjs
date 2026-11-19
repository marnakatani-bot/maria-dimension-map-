import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Source: https://developers.cloudflare.com/ai-crawl-control/reference/bots/
export const crawlers = [
  ['GPTBot', 'OpenAI', 'AI Crawler'],
  ['OAI-SearchBot', 'OpenAI', 'AI Search'],
  ['ChatGPT-User', 'OpenAI', 'AI Assistant'],
  ['ClaudeBot', 'Anthropic', 'AI Crawler'],
  ['Claude-SearchBot', 'Anthropic', 'AI Search'],
  ['Claude-User', 'Anthropic', 'AI Assistant'],
  ['PerplexityBot', 'Perplexity', 'AI Search'],
  ['Perplexity-User', 'Perplexity', 'AI Assistant'],
];
export const classify = ua => {
  const hit = crawlers.find(([name]) => new RegExp(`(?:^|[\\s;(])${name}(?:/|[\\s;)]|$)`, 'i').test(ua));
  return hit ? { name: hit[0], operator: hit[1], category: hit[2] } : null;
};

export function jstDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must be YYYY-MM-DD');
  const start = Date.parse(`${date}T00:00:00+09:00`);
  if (!Number.isFinite(start) || new Date(start + 9 * 3600000).toISOString().slice(0, 10) !== date)
    throw new Error('Invalid date');
  return [start, start + 86400000];
}

export async function collect({ token, zoneId, date, hostname = 'observations.dimension-map.com', fetchImpl = fetch }) {
  if (!token || !/^[a-f0-9]{32}$/i.test(zoneId ?? '')) throw new Error('CF_API_TOKEN and valid CF_ZONE_ID are required');
  const [start, end] = jstDay(date);
  if (end > Date.now()) throw new Error('Requested JST day has not ended; do not label a partial day complete');
  const request = async query => {
    const response = await fetchImpl('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Cloudflare HTTP ${response.status}; no zero-count result written`);
    const body = await response.json();
    if (body.errors?.length) throw new Error(`Cloudflare rejected analytics query: ${body.errors.map(e => e.message).join('; ')}`);
    const zone = body.data?.viewer?.zones?.[0];
    if (!zone) throw new Error('Zone analytics missing; no zero-count result written');
    return zone;
  };
  const settings = (await request(`{ viewer { zones(filter: {zoneTag: ${JSON.stringify(zoneId)}}) {
    settings { httpRequestsAdaptiveGroups { enabled maxPageSize maxDuration notOlderThan availableFields } }
  } } }`)).settings?.httpRequestsAdaptiveGroups;
  if (!settings?.enabled) throw new Error('httpRequestsAdaptiveGroups unavailable on this zone');
  const dimensions = ['datetimeHour', 'clientRequestHTTPHost', 'clientRequestPath', 'edgeResponseStatus', 'userAgent'];
  const required = ['count', ...dimensions.map(f => `dimensions_${f}`)];
  if (!Array.isArray(settings.availableFields) || required.some(f => !settings.availableFields.includes(f)))
    throw new Error('Required dimensions unavailable. Inspect settings before changing the query.');
  if (Date.now() - start > settings.notOlderThan * 1000) throw new Error('Requested day is outside available retention');
  const limit = Math.min(5000, settings.maxPageSize);
  const span = Math.min(3600000, settings.maxDuration * 1000);
  if (!(limit > 0 && span >= 1000)) throw new Error('Invalid analytics limits');
  const raw = [];
  const iso = t => new Date(t).toISOString();
  async function readWindow(from, to) {
    const rows = (await request(`{ viewer { zones(filter: {zoneTag: ${JSON.stringify(zoneId)}}) {
      httpRequestsAdaptiveGroups(limit: ${limit}, filter: {
        datetime_geq: ${JSON.stringify(iso(from))}, datetime_lt: ${JSON.stringify(iso(to))},
        requestSource: "eyeball", clientRequestHTTPHost: ${JSON.stringify(hostname)},
        OR: [${crawlers.map(([name]) => `{ userAgent_like: ${JSON.stringify(`%${name}%`)} }`).join(',')}]
      }) { count dimensions { ${dimensions.join(' ')} } }
    } } }`)).httpRequestsAdaptiveGroups;
    if (!Array.isArray(rows)) throw new Error('Rows missing; do not interpret as zero');
    if (rows.length >= limit) {
      if (to - from < 2000) throw new Error('Row limit reached; export incomplete, no success file written');
      const mid = from + Math.floor((to - from) / 2000) * 1000;
      await readWindow(from, mid); await readWindow(mid, to); return;
    }
    raw.push(...rows);
  }
  for (let from = start; from < end; from += span) await readWindow(from, Math.min(from + span, end));
  const groups = new Map();
  for (const row of raw) {
    const d = row.dimensions;
    if (!d || d.clientRequestHTTPHost !== hostname || !Number.isFinite(row.count)) throw new Error('Unexpected analytics row');
    const crawler = classify(d.userAgent ?? '');
    if (!crawler) continue;
    const key = JSON.stringify(d);
    const previous = groups.get(key);
    if (previous) previous.requests += row.count;
    else groups.set(key, { ...crawler, hourUTC: d.datetimeHour, host: d.clientRequestHTTPHost,
      path: d.clientRequestPath, status: d.edgeResponseStatus, userAgent: d.userAgent, requests: row.count });
  }
  const rows = [...groups.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { schemaVersion: 1, status: 'complete', dateJST: date, hostname, collectedAt: new Date().toISOString(),
    startUTC: iso(start), endUTCExclusive: iso(end), dataset: 'httpRequestsAdaptiveGroups', settings,
    identification: 'Self-declared User-Agent; spoofable; not verified operator identity',
    timeResolution: 'Hour aggregates, not individual request timestamps',
    sampling: 'Cloudflare adaptive analytics; counts may be sampled or estimated; not exhaustive raw access logs',
    scope: 'Only the listed crawler User-Agent tokens on the exact target hostname; no IP or query string collected',
    interpretation: 'Requests do not prove model training. Test requests must use CDM-Archive-Verification, never crawler User-Agents.',
    totalRequests: rows.reduce((n, r) => n + r.requests, 0), rows, rawGroups: raw };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const value = flag => args[args.indexOf(flag) + 1];
    const date = args.includes('--date') ? value('--date') : new Date(Date.now() + 9 * 3600000 - 86400000).toISOString().slice(0, 10);
    const result = await collect({ token: process.env.CF_API_TOKEN, zoneId: process.env.CF_ZONE_ID, date });
    const out = resolve(args.includes('--out') ? value('--out') : 'ai-crawl-data');
    await mkdir(out, { recursive: true });
    await writeFile(resolve(out, `${date}.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(`Saved ${date}: ${result.totalRequests} requests; User-Agent identification only`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
