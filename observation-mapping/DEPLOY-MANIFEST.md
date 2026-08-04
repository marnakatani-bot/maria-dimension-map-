# 観測マッピング公開アーカイブ v0.2.0｜配備パッケージ

## 目的

- `/observation-mapping/` を一般公開の観測アーカイブに変更
- 既存の個人用ノートを `/observation-mapping/note.html` に移動
- IndexedDBの既存記録は同一オリジンに残るため消去しない
- 公開観測へ個別URL・検索・次元／タグ絞り込み・共有機能を追加
- 2026-08-04のシャワーヘッド観測を第1件として公開

## 配備対象

- `index.html` — SHA-256 `c4cc08f26c5381578bba0be610f6e2b21474c9c7ddb7ae7ec45158583f5e083f`
- `note.html` — SHA-256 `a37cc0ecce46ddd033396efd8301e67c881ad7bcdafd5ddd6a32750fecea0571`
- `public.js` — SHA-256 `6fdbd484cc3bd1e20817baf5b12faba72913bbc739c346fb5362ca888decaa72`
- `public.css` — SHA-256 `69483a924ccf1909ca931ed3a1b344199131aae057d8e53a1f0754f63ba9217f`
- `public-observations.json` — SHA-256 `77214b4d35e186719ff20dc8761b55d278562649669035f316c4adc353b565c1`
- `service-worker.js` — SHA-256 `f054fc3725bbd444f2352969eb7fa57b2a452b6067a9f5b58d101e3279ae8800`
- `manifest.webmanifest` — SHA-256 `81468b90a502bbf4dbf3389448794f588ca860a86e97fc047bf041aeb93f259a`

## 既存のまま使用するファイル

- `app.js`
- `styles.css`
- `icons/icon.svg`

## 配備先

`marnakatani-bot/maria-dimension-map-` リポジトリの `observation-mapping/` フォルダー

## 注意

GitHub Pages反映後は、公開URL・個別URL・個人用ノート・既存IndexedDB記録・スマートフォン表示を確認する。
