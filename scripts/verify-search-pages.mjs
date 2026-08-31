import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const archiveDir = path.join(repoRoot, 'observation-mapping');
const recordsRoot = path.join(archiveDir, 'records');
const data = JSON.parse(fs.readFileSync(path.join(archiveDir, 'public-observations.json'), 'utf8'));
const records = data.records;
const siteBase = 'https://marnakatani-bot.github.io/maria-dimension-map-/';
const archiveBase = siteBase + 'observation-mapping/';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeText(value) {
  return escapeHtml(value).replace(/ +(?=\r?\n|$)/g, (spaces) => '&#32;'.repeat(spaces.length));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const generatedIds = fs.readdirSync(recordsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const sourceIds = records.map((record) => record.id).sort();
assert(JSON.stringify(generatedIds) === JSON.stringify(sourceIds), '生成ページのID一覧が公開JSONと一致しません。');

for (const record of records) {
  const filePath = path.join(recordsRoot, record.id, 'index.html');
  assert(fs.existsSync(filePath), `静的ページがありません: ${record.id}`);
  const html = fs.readFileSync(filePath, 'utf8');
  const canonical = archiveBase + 'records/' + encodeURIComponent(record.id) + '/';
  assert(html.includes(`<link rel="canonical" href="${canonical}">`), `canonical不一致: ${record.id}`);
  assert(html.includes(`<h1 class="detail-title">${escapeHtml(record.title)}</h1>`), `タイトル不一致: ${record.id}`);
  assert(html.includes(`<div class="longtext">${escapeText(record.body || '')}</div>`), `本文不一致: ${record.id}`);
  for (const [label, value] of [
    ['次元展開', record.dimExpand],
    ['整理メモ', record.memo],
    ['研究への接続', record.research],
    ['関連記録', record.related]
  ]) {
    if (value) assert(html.includes(escapeText(value)), `${label}不一致: ${record.id}`);
  }
  assert((html.match(/<h1\b/g) || []).length === 1, `h1数が1ではありません: ${record.id}`);
}

const sitemap = fs.readFileSync(path.join(repoRoot, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(locs.length === records.length + 3, 'sitemap URL数が一致しません。');
assert(new Set(locs).size === locs.length, 'sitemap URLが重複しています。');
assert(locs.includes(siteBase), 'トップページがsitemapにありません。');
assert(locs.includes(siteBase + 'project/'), 'プロジェクトページがsitemapにありません。');
assert(locs.includes(archiveBase), '観測アーカイブがsitemapにありません。');
for (const record of records) {
  assert(locs.includes(archiveBase + 'records/' + encodeURIComponent(record.id) + '/'), `sitemapに観測がありません: ${record.id}`);
}

const rootHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const archiveHtml = fs.readFileSync(path.join(archiveDir, 'index.html'), 'utf8');
const noteHtml = fs.readFileSync(path.join(archiveDir, 'note.html'), 'utf8');
assert(rootHtml.includes('href="observation-mapping/"'), 'トップページから観測アーカイブへのリンクがありません。');
assert(archiveHtml.includes(`<link rel="canonical" href="${archiveBase}">`), '観測アーカイブのcanonicalがありません。');
assert(archiveHtml.includes('href="../"') && archiveHtml.includes('href="../project/"'), '観測アーカイブから主要ページへのリンクがありません。');
assert(noteHtml.includes('<meta name="robots" content="noindex, nofollow">'), '個人用ノートにnoindexがありません。');

console.log(`Verified ${records.length} static pages, ${locs.length} sitemap URLs, canonical links, internal links, and exact observation text.`);
