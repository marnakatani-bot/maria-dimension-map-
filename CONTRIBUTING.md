# 運用マニュアル

このリポジトリを更新するときの手順と決まり。著者・中谷まり亜と、作業を手伝うAIが使う文書で、読者が読む必要はない。AIに作業を頼むときは、最初にこのファイルを読ませる。

## 1. 基本の決まり

- 決めるのは著者で、AIは下書き・作業・確認を受け持つ。AIどうしの合意だけで定義を確定しない。
- README は入口とし、3分で全体像がわかる長さ（150行以内）を保つ。詳しい説明は docs/ に置く。
- 一つの内容は一か所にだけ書き、ほかの場所からはリンクする。
- 更新するときは、古い記述に追記せず置き換える。古い版は git の履歴と CHANGELOG.md に残る。
- 本文には作業の日付・経緯・commit 番号を書かない。経緯は commit メッセージに、読者に関わる変更は CHANGELOG.md に1行で書く。
- 次元の名前は README の早見表にそろえる。
- 公開済みのページを移すときは、旧URLを転送して残す（4-7）。

## 2. 正本の範囲

定義の正本は、README と docs/ の4ページ（dimensions.md・glossary.md・faq-6d.md・hypotheses.md）とする。docs/ のほかのページは解説、papers/ の論文と過去の資料（docs/archive/）は執筆当時の記録として扱う。

## 3. 何をどこに書くか

| 書くもの | 書く場所 |
| :- | :- |
| 理論の一文定義、「各次元とは」、全体構造の定義 | README（ひとことで言うと・各次元の早見表・全体図） |
| 3D〜9Dの名前・視座・視点などの一覧 | README の早見表 |
| 各次元の詳しい説明、理論の核、既存概念との違い | docs/dimensions.md |
| 用語の定義 | docs/glossary.md |
| 6Dについての問いと答え | docs/faq-6d.md |
| 次元どうしの関係の仮説 | docs/hypotheses.md |
| AIエージェント向けの仕様と使い方 | docs/for-ai.md |
| 眼・体験・意識・仏教・経済などの解説 | docs/ の各ページ |
| 古くなった資料 | docs/archive/ |
| 論文 | Zenodo（正本）と README の「論文」 |
| 著者の観測記録 | observation-mapping/public-observations.json |
| 読者に関わる変更の記録 | CHANGELOG.md（1行） |
| 作業の経緯、AIとの議論 | commit メッセージ、作業ブランチ、research-dialogues/ |

README に書かないもの：作業メモ、日付つきの経緯、commit 番号、AIへの指示文、同じ定義の言い直し。

## 4. よくある作業の手順

### 4-1. 定義や次元の名前を変える

1. 著者が新しい文や名前を決める。AIが出すのは候補までにとどめる。
2. README の該当箇所を置き換え、古い文は残さない。
3. 同じ語を使っている箇所を検索して直す（`git grep "古い語"`）。早見表の名前を変えたときは、docs/dimensions.md の表と docs/eyes.md の見出しも合わせる。
4. CHANGELOG.md に1行足し、6章のチェックリストで確かめる。

### 4-2. 用語を足す・直す

docs/glossary.md の表に1行足すか、該当する行を置き換える。

### 4-3. 問いと答え（FAQ）を足す

6Dの問いは、docs/faq-6d.md に続き番号で足す。ほかの次元の問いが増えてきたら docs/faq.md を作り、README の「もっと詳しく」に1行加える。

### 4-4. 解説ページを足す

1. docs/ に Markdown ファイルを作る。
2. README の「もっと詳しく」の表に1行足す。
3. tools/public-research-paths.json に1件加え、サイトの索引とサイトマップを作り直す（7章）。

### 4-5. 論文を公開したとき

1. README の「論文」に1行足す。
2. CITATION.cff の references に1件加える。
3. 公式HUB（index.html）の論文カードと構造化データ（ScholarlyArticle）に1件足し、「論文8本」などの本数の表記も直す。
4. tools/generate-research-index.mjs は論文カードがちょうど8件あることを確かめているので、その数を新しい本数に直す。直さないと索引の生成が止まる。
5. サイトの索引を作り直し（7章）、CHANGELOG.md に1行足す。

### 4-6. 観測記録を公開する

observation-mapping/public-observations.json に記録を足し、観測ページとサイトマップを作り直す。手順は observation-mapping/README.md にある。

### 4-7. ページを移す・名前を変える

公開済みのURLは、論文・記事・検索エンジンから参照されている。ページを移すときは、移した先のファイルの先頭に旧URLを書いて転送する。

```
---
redirect_from:
  - /旧ファイル名.html
---
```

あわせて README・docs・tools/public-research-paths.json のリンクを直し、索引とサイトマップを作り直す。

### 4-8. 理論を深める作業

次元どうしの関係や新しい仮説の検討は、作業ブランチ（例：cdm-source-draft）で進め、main には入れない。著者が確定したものだけを、4-1 の手順で README と docs/ に入れる。作業ブランチでの議論や候補は README に持ち込まない。

## 5. AIへの頼み方

### 頼むときの型

コピーして、括弧の中を書き換えて使う。

```
最初に CONTRIBUTING.md を読んでから作業してください。
やること：（例：docs/glossary.md に「○○」を追加する）
著者が決めたこと：（決めた文や名前をそのまま書く）
完成の条件：（例：用語集に1行増え、リンク切れがない）
しないでほしいこと：決まっていない内容の書き足し、同じ監査や照合のくり返し
判断に迷う点は、作業を止めずに最後に一覧にして出してください。
```

### 監査を頼むとき

- 反映前に1回だけ頼み、見る観点は3つまでに絞る（例：リンク切れ、名前の統一、README の行数）。
- 引用の一字一句の照合は、文章を移したときにだけ行い、機械で照合する。

### 作業がずれたり、終わらなくなったりしたら

- 「完成の条件」を示し直す。
- 「残っている問題を一覧にして、そこで終えてください」と頼む。
- 同じ指摘が2回出たら、著者が決めて終わりにする。

## 6. 反映前のチェックリスト

- [ ] README が150行以内（`wc -l README.md`）
- [ ] 同じ定義文を2か所に書いていない
- [ ] 3D〜9Dの名前が早見表と同じ
- [ ] README に作業メモ・日付つきの経緯・commit 番号・AIへの指示文がない
- [ ] リンクが切れていない
- [ ] サイトの検証が通る（`node tools/verify-search-pages.mjs`）
- [ ] CHANGELOG.md に1行足した
- [ ] 著者が内容を確認した

## 7. 仕組みのメモ

- 公式サイトは GitHub Pages で、main に入ると数分で公開される。docs/ の Markdown は .html のページになる。
- 旧URLの転送には jekyll-redirect-from を使い、設定は _config.yml にある。
- サイトの索引とサイトマップは、tools/public-research-paths.json をもとに作る。このファイルを直したら、リポジトリのルートで次の3つを実行する。

```
node tools/generate-observation-pages.mjs
node tools/generate-research-index.mjs
node tools/verify-search-pages.mjs
```

- Windows では、改行コードの違いだけで観測ページが「変更あり」に見えることがある。`git diff` で内容に差がなければ、`git checkout -- observation-mapping/records` で元に戻す。
- AIクローラーの集計は、.github/workflows/ai-crawl-archive.yml が毎日5時20分（日本時間）に tools/ai-crawl/ を実行し、ai-crawl-observations ブランチに記録する。
- observations/ は Cloudflare Pages（observations.dimension-map.com）でも公開している。フォルダ名を変えるときは、Cloudflare 側の設定も変える必要がある。
- 直下から動かせないもの：index.html、robots.txt、sitemap.xml、_config.yml、Google の確認ファイル（google4e5cc6e6e6ce16c8.html）。

## 8. 定義文の書き方

**各次元の定義文は、視座の行から構成する。視点・視野・Do（行為）・Be（在り方）は、定義文のあとで役割を区別して説明する。** 定義は「XとはYである」の肯定形で示す。見る対象や行為だけから視座を決めず、未確定の語は確認待ちとして保持する。

6Dの視座・視点・視野は、見る主体が成立しないことに対応して「なし」と記す。9Dで6Dを含む構造を説明するときも、この主体不成立を保持する。視野の広がりは各次元の対等性と併せて記述する。

各次元の定義・一次観測と、外部学問で実証された知見、探索中の仮説は、それぞれの根拠を明示して区別する。
