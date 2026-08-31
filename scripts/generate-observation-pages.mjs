import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const archiveDir = path.join(repoRoot, 'observation-mapping');
const recordsRoot = path.join(archiveDir, 'records');
const dataPath = path.join(archiveDir, 'public-observations.json');
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

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function descriptionFor(record) {
  const source = normalizeText(record.summary || record.body || record.title);
  return source.length > 155 ? source.slice(0, 154) + '…' : source;
}

function dateOnly(value) {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function displayDate(value) {
  const date = dateOnly(value);
  if (!date) return String(value || '');
  const [year, month, day] = date.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function chip(value) {
  return `<span class="chip chip-static">${escapeHtml(value)}</span>`;
}

function textSection(title, value) {
  if (!value) return '';
  return `\n      <h2 class="sec-head">${escapeHtml(title)}</h2>\n      <div class="longtext">${escapeText(value)}</div>`;
}

function imageSection(record) {
  if (!Array.isArray(record.images) || !record.images.length) return '';
  const figures = record.images.map((image) => {
    const source = String(image.src || '').replace(/^\.\//, '');
    const src = /^https?:\/\//.test(source) ? source : '../../' + source;
    const caption = image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : '';
    return `<figure class="public-image"><img src="${escapeHtml(src)}" alt="${escapeHtml(image.alt || '')}" loading="lazy">${caption}</figure>`;
  }).join('\n        ');
  return `\n      <section class="public-images">\n        <h2 class="sec-head">観測画像</h2>\n        ${figures}\n      </section>`;
}

function safeJsonLd(value) {
  return JSON.stringify(value, null, 2).replaceAll('</', '<\\/');
}

function recordPage(record, index, records) {
  const canonical = archiveBase + 'records/' + encodeURIComponent(record.id) + '/';
  const description = descriptionFor(record);
  const labels = []
    .concat(record.entry || [])
    .concat(record.dimensions || [])
    .concat(record.state || [])
    .concat(record.stage || [])
    .concat((record.tags || []).map((tag) => '#' + tag));
  const newer = index > 0 ? records[index - 1] : null;
  const older = index < records.length - 1 ? records[index + 1] : null;
  const navigation = [
    newer ? `<a class="btn btn-ghost" href="../${encodeURIComponent(newer.id)}/">← 新しい観測</a>` : '<span></span>',
    older ? `<a class="btn btn-ghost" href="../${encodeURIComponent(older.id)}/">古い観測 →</a>` : '<span></span>'
  ].join('');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': canonical + '#article',
        headline: record.title,
        description,
        datePublished: record.date,
        dateModified: record.updatedAt || record.date,
        inLanguage: 'ja',
        author: {
          '@type': 'Person',
          name: '中谷まり亜',
          alternateName: 'Maria Nakatani',
          url: siteBase
        },
        mainEntityOfPage: canonical,
        isPartOf: archiveBase,
        articleSection: '意識の次元マッピング｜一次観測',
        keywords: (record.tags || []).join(', ')
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '意識の次元マッピング', item: siteBase },
          { '@type': 'ListItem', position: 2, name: '公開観測アーカイブ', item: archiveBase },
          { '@type': 'ListItem', position: 3, name: record.title, item: canonical }
        ]
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1b1c20">
<title>${escapeHtml(record.title)}｜公開観測アーカイブ</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(record.title)}｜公開観測アーカイブ">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<link rel="stylesheet" href="../../styles.css">
<link rel="stylesheet" href="../../public.css">
<link rel="icon" href="../../icons/icon.svg" type="image/svg+xml">
<script type="application/ld+json">
${safeJsonLd(jsonLd)}
</script>
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <a class="app-title" href="../../">公開観測アーカイブ</a>
    <div class="topbar-actions static-source-links">
      <a class="btn btn-ghost" href="../../../">公式HUB</a>
      <a class="btn btn-ghost" href="../../../project/">プロジェクト</a>
    </div>
  </div>
</header>
<main class="wrap">
  <article class="panel detail">
    <p class="eyebrow">公開一次観測</p>
    <h1 class="detail-title">${escapeHtml(record.title)}</h1>
    <p class="muted">記録日：${escapeHtml(displayDate(record.date))}｜観測・執筆：中谷まり亜（Maria Nakatani）</p>
    <div class="labels">${labels.map(chip).join('')}</div>

    <h2 class="sec-head">原観測</h2>
    <div class="longtext">${escapeText(record.body || '')}</div>${imageSection(record)}${textSection('次元展開', record.dimExpand)}${textSection('整理メモ', record.memo)}${textSection('研究への接続', record.research)}${textSection('関連記録', record.related)}

    <nav class="static-nav" aria-label="観測記録の前後移動">${navigation}</nav>
    <div class="row-actions detail-actions">
      <a class="btn btn-primary" href="../../">公開観測一覧へ</a>
    </div>
    <p class="muted small">原観測は、中谷まり亜本人が記録した一次情報です。理論的な整理や検証は後続工程で行います。</p>
  </article>
</main>
</body>
</html>
`;
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
if (!data || !Array.isArray(data.records)) throw new Error('public-observations.json に records 配列がありません。');
const records = data.records;
const ids = new Set();
for (const record of records) {
  if (!/^[a-z0-9-]+$/.test(record.id || '')) throw new Error(`不正な公開ID: ${record.id}`);
  if (ids.has(record.id)) throw new Error(`公開IDが重複しています: ${record.id}`);
  ids.add(record.id);
}

if (!recordsRoot.startsWith(archiveDir + path.sep)) throw new Error('生成先が観測アーカイブ外です。');
fs.mkdirSync(recordsRoot, { recursive: true });
for (const entry of fs.readdirSync(recordsRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && !ids.has(entry.name)) {
    const stalePath = path.resolve(recordsRoot, entry.name);
    if (!stalePath.startsWith(recordsRoot + path.sep)) throw new Error('削除対象が生成先外です。');
    fs.rmSync(stalePath, { recursive: true, force: true });
  }
}

records.forEach((record, index) => {
  const targetDir = path.join(recordsRoot, record.id);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), recordPage(record, index, records), 'utf8');
});

const sitemapUrls = [siteBase, siteBase + 'project/', archiveBase].map((loc) => ({ loc, lastmod: '' }));
for (const record of records) {
  sitemapUrls.push({
    loc: archiveBase + 'records/' + encodeURIComponent(record.id) + '/',
    lastmod: dateOnly(record.updatedAt || record.date)
  });
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(({ loc, lastmod }) => `  <url>\n    <loc>${escapeHtml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(repoRoot, 'sitemap.xml'), sitemap, 'utf8');

console.log(`Generated ${records.length} static observation pages and sitemap.xml with ${sitemapUrls.length} URLs.`);
