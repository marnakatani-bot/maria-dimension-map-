import fs from 'node:fs';
const root=new URL('../',import.meta.url),base='https://marnakatani-bot.github.io/maria-dimension-map-/';
const entries=JSON.parse(fs.readFileSync(new URL('scripts/public-research-paths.json',root),'utf8'));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fixed=[{path:'project/',label:'意識の次元マッピング・プロジェクト｜7世代先へ',group:'研究プロジェクト'},{path:'observation-mapping/',label:'公開観測アーカイブ｜一次観測の記録',group:'観測記録'}];
const grouped=new Map();for(const e of [...fixed,...entries]){if(e.path==='research/')continue;if(!grouped.has(e.group))grouped.set(e.group,[]);grouped.get(e.group).push(e)}
const sections=[...grouped].map(([name,items])=>`<section><h2>${esc(name)}</h2><ul>${items.map(e=>`<li><a href="${esc(new URL(e.path,base).href)}">${esc(e.label)}</a>${e.source?` <span class="formats">[<a href="${esc(new URL(e.source,base).href)}">Markdown原文</a> · <a href="https://github.com/marnakatani-bot/maria-dimension-map-/blob/main/${esc(e.source)}">GitHub原典</a>]</span>`:''}</li>`).join('\n')}</ul></section>`).join('\n');
const hub=fs.readFileSync(new URL('index.html',root),'utf8');
const doi=[...hub.matchAll(/<a class="card" href="(https:\/\/doi\.org\/[^"]+)">([\s\S]*?)<\/a>/g)].map(m=>({url:m[1],label:m[2].match(/<span class="name">([^<]+)/)?.[1]}));
const doiLinks=doi.filter(x=>x.label).map(x=>`<li><a href="${esc(x.url)}">${esc(x.label)}</a></li>`).join('\n');
const html=`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>公開研究資料の索引｜意識の次元マッピング｜中谷まり亜</title>
<meta name="author" content="中谷まり亜（Maria Nakatani）"><meta name="description" content="中谷まり亜による意識の次元マッピングの公開原典、解説、観測記録、論文、研究対話への索引。">
<link rel="canonical" href="${base}research/"><link rel="sitemap" type="application/xml" href="../sitemap.xml">
<style>body{margin:0;background:#f6f5ef;color:#202d3b;font:16px/1.85 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:40px 24px}h1{font-size:clamp(1.6rem,4vw,2.3rem)}h2{font-size:1.25rem}section{background:white;border:1px solid #dddcd4;border-radius:12px;padding:20px 26px;margin:24px 0}a{color:#205a71;overflow-wrap:anywhere}li{margin:.65em 0}.formats,footer{font-size:.9em;color:#596572}nav{display:flex;gap:22px;flex-wrap:wrap}</style></head>
<body><main><nav><a href="../">公式HUB</a><a href="https://github.com/marnakatani-bot/maria-dimension-map-/">公式GitHub原典</a></nav>
<h1>公開研究資料の索引</h1><p>研究者・著者：中谷まり亜（Maria Nakatani）<br>意識の次元マッピング（Consciousness Dimension Mapping）</p>
<p>公式HUBで公開している研究資料への入口です。各資料の本文と出典はリンク先で確認できます。現行の理論定義は公式READMEを正本とし、歴史資料は執筆当時の記録として参照してください。</p>
${sections}
<section><h2>論文の正本・外部記事</h2><p>論文の正本は各DOIから参照してください。執筆当時の用語は各論文に保持されています。</p><ul>${doiLinks}</ul>
<p><a href="https://multidimension.hatenablog.com/">はてなブログ</a> · <a href="https://note.com/maria_nakatani2">note</a> · <a href="https://substack.com/@dimensionmap">Substack</a></p></section>
<section><h2>観測アーカイブの追加入口</h2><p><a href="https://observations.dimension-map.com/">独自ドメイン版｜AI巡回観測用</a>。長期保存用の基準URLは<a href="../observations/">GitHub Pages版</a>です。</p></section>
<footer>© 2026 中谷まり亜（Maria Nakatani）｜<a href="../">公式HUB</a>｜<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>。引用・再構成では著者名と原典URLを明記してください。</footer></main></body></html>\n`;
if(doi.length!==8||doi.filter(x=>x.label).length!==8)throw new Error('Expected eight existing DOI links; inspect HUB markup before generating');
fs.mkdirSync(new URL('research/',root),{recursive:true});fs.writeFileSync(new URL('research/index.html',root),html);
console.log(`Generated public research index with ${entries.length+fixed.length-1} local resources and eight existing DOI links.`);
