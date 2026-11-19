# AIクローラー日次集計

公開資料は `observations/`、長期保存用基準URLは https://marnakatani-bot.github.io/maria-dimension-map-/observations/ 。追加入口 https://observations.dimension-map.com/ は Cloudflare Pages が main の observations/ を自動公開する。ビルド exit 0、出力 observations。データ保存用ブランチのプレビュー公開は無効。

`.github/workflows/ai-crawl-archive.yml` が毎日05:20日本時間に前日の日本時間1日分を取得し、同じリポジトリの `ai-crawl-observations` ブランチの `daily/YYYY-MM-DD.json` に追記する。手動実行の日付指定で保持期間内の欠測日を補える。既存の日付は上書きせず、修正が必要なら原本を保持して別記録を作る。初回検証日の2026-10-14は公開前の日であり、巡回開始後の実績として扱わない。

対象はホスト完全一致かつコード内8種類のUser-Agent。運営元・種別は公式Bot一覧との対応付けであり、アクセス元の本人確認ではない。取得項目はUTC時間枠、ホスト、パス、HTTPステータス、User-Agent、回数。IP・クエリ文字列は収集しない。Adaptive Analyticsはサンプリングや推計を含み得る。秒単位の生ログや厳密な全件取得とは区別する。巡回やHTTP200はモデル学習の証明ではない。

認証失敗、未対応スキーマ、期間外、上限超過、未完了日の取得は失敗扱いでゼロ件として保存しない。ゼロ件は正常取得した該当集計が空だったことのみを意味する。Cloudflareの遅延やサンプリングによる不検出はあり得る。自分の検品では `CDM-Archive-Verification/1.0` を使い、AIを名乗らない。

2026-10-15実測の対象ゾーン設定：httpRequestsAdaptiveGroups enabled、notOlderThan=2678400秒（31日）、maxDuration=2592000秒（30日）、maxPageSize=10000。都度settingsを取得して適合確認する。日次ファイルはGitで保持し、Actionsの短期Artifact保存には依存しない。公開リポジトリの標準ubuntu runnerを使用し有料契約は追加しない。GitHubのスケジュールは遅延し得るほか、公開リポジトリで60日間活動がないと無効になるため、Actions画面で実行状況と欠測を確認する。API停止やドメイン失効後の取得継続は保証しない。保存済みデータとGitHub Pagesは保持される。

Secret `CF_API_TOKEN` は対象ゾーンのAnalytics Readのみ。CIジョブの一時GITHUB_TOKENにはデータ追記のcontents:writeを付与。PRやpushからこのワークフローは起動せず、schedule/manualのみ。秘密値はGit・ログ・Notionに書かない。

既存のAIセキュリティ設定は維持した。既にブロックされているクローラーの取得成功は制限され得る。今回一括ブロック・課金・制限解除は設定していない。

公式資料：
- https://developers.cloudflare.com/ai-crawl-control/reference/graphql-api/
- https://developers.cloudflare.com/ai-crawl-control/reference/bots/
- https://developers.cloudflare.com/analytics/graphql-api/features/discovery/settings/
- https://docs.github.com/en/actions/concepts/billing-and-usage
- https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
