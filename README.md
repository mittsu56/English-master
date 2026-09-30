# 英単語マスター

英単語・熟語を4択で学ぶ学習アプリ（静的Webアプリ）。

## レベル（TOEIC点数帯）
各レベル80語（英単語＋熟語）、全400語。単語は `data.js` の `WORDS` に `lv`（1〜5）付きで入っています。

| レベル | 目安 | 内容 |
|---|---|---|
| 1 | 〜400 | 日常の基本語・基本熟語 |
| 2 | 400〜 | 日常＋ビジネス入門 |
| 3 | 600〜 | 基本的なビジネス語彙 |
| 4 | 730〜 | 契約・財務・人事などの実務語彙 |
| 5 | 860〜 | 高度なビジネス語彙・書き言葉 |

## GitHub Pagesで公開する
1. GitHubのリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする
2. **Actions** タブの「Deploy to GitHub Pages」を実行する（`main` か開発ブランチへのpushでも自動実行）
3. 公開URL: `https://<ユーザー名>.github.io/English-master/`

`github-pages` 環境がブランチを制限している場合は、**Settings → Environments → github-pages** の
Deployment branches に、デプロイするブランチを追加してください。

## ホーム画面に追加する（PWA）
HTTPSで公開したURL（GitHub Pagesなど）を開いて追加します。
- **iPhone (Safari)**: 共有ボタン →「ホーム画面に追加」
- **Android (Chrome)**: メニュー →「ホーム画面に追加」／「アプリをインストール」

追加後はアプリのように全画面で起動し、オフラインでも使えます。
