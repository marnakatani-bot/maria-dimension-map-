import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('GitHub repository and token required');
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) throw new Error('Date required');
const content = await readFile(resolve('export', `${date}.json`), 'utf8');
const result = JSON.parse(content);
if (result.status !== 'complete' || result.dateJST !== date || result.hostname !== 'observations.dimension-map.com')
  throw new Error('Only a complete result for the target host may be archived');
const branch = 'ai-crawl-observations';
const api = async (path, method = 'GET', body, allow404 = false) => {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  if (allow404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
  return response.json();
};
const ref = await api(`git/ref/heads/${branch}`, 'GET', undefined, true);
const path = `daily/${date}.json`;
if (ref) {
  const existing = await api(`contents/${path}?ref=${branch}`, 'GET', undefined, true);
  if (existing) {
    console.log(`${path} already archived; immutable daily file retained`);
    process.exit(0);
  }
}
const parent = ref ? await api(`git/commits/${ref.object.sha}`) : null;
const blob = await api('git/blobs', 'POST', { content, encoding: 'utf-8' });
const entries = [{ path, mode: '100644', type: 'blob', sha: blob.sha }];
if (!parent) entries.push({ path: 'README.md', mode: '100644', type: 'blob', content:
  '# AI crawler observation data\n\nDaily JST aggregates for observations.dimension-map.com. Source and workflow: main branch operations/ai-crawl/. User-Agent identification is spoofable; counts may be sampled or estimated. No inference of model training. Zero means a successful query returned no matching rows, not proof of no traffic. Original daily files are append-only.\n' });
const tree = await api('git/trees', 'POST', { ...(parent ? { base_tree: parent.tree.sha } : {}), tree: entries });
const commit = await api('git/commits', 'POST', { message: `Archive AI crawler aggregates for ${date} JST`,
  tree: tree.sha, parents: parent ? [parent.sha] : [] });
if (ref) await api(`git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha, force: false });
else await api('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: commit.sha });
console.log(`Archived ${path}: ${commit.sha}`);
