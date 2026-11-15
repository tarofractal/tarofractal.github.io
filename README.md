# Taro Nagata — Personal Website

Taro Nagata / 永田 多朗のパーソナルサイト。研究、制作物、関心、連絡先を紹介する、英語を主言語とした日英対応の静的ウェブサイトです。

HTML・CSS・JavaScript のみで動作します。npm のインストールやビルドは不要です。

## ファイル

| 場所 | 内容 |
| --- | --- |
| `dist/index.html` | 本文、プロフィール、作品、リンク、日英テキスト |
| `dist/styles.css` | レイアウト、色、書体、レスポンシブ表示 |
| `dist/app.js` | 日英切り替え、テーマ切り替え、動きの制御 |
| `dist/assets/` | ローカル配信する書体、ライセンス、CV など |
| `.openai/hosting.json` | Sites 用のプロジェクト ID と配信ディレクトリ |
| `docs/DOMAIN-SETUP.ja.md` | GitHub Pages と独自ドメインの設定手順 |
| `docs/CONTENT-SOURCES.md` | 掲載内容の出典と素材の扱い |

## 手元で見る

リポジトリのディレクトリで、次を実行します。Python 3 が必要です。

```sh
python3 -m http.server 3000 --directory dist
```

ブラウザで <http://localhost:3000> を開きます。終了はターミナルで `Ctrl+C`。

## 内容を更新する

`dist/index.html` の本文を編集します。`data-en` と `data-ja` が付いた要素は、両方の言語を更新してください。外部リンク、所属、年、数値も同時に確認します。CV を差し替える場合は `dist/assets/` 内の PDF と HTML のリンク先を一致させます。

動きを加えるときは、動きを減らす OS 設定とサイト内の停止操作を維持してください。公開前にスマートフォン幅、日英切り替え、昼夜テーマ、キーボード操作、連絡先・CV のリンクを確認します。

## GitHub に保存・公開する

保存先は [tarofractal/tarofractal.github.io](https://github.com/tarofractal/tarofractal.github.io) です。今回の変更は `personal-site-2026` ブランチからレビューできる形にし、既存サイトへの反映は PR のマージで行います。

長期の公開先には GitHub Pages を使用できます。GitHub Actions が `dist/` を配信する設定にします。公開設定と `taronagata.com` の接続は [独自ドメイン設定ガイド](docs/DOMAIN-SETUP.ja.md) に記載しています。

Sites にも確認用の配信先を用意します。設定上の予定 URL は `https://taro-nagata-observatory.tarofractal.chatgpt.site` です。URL が設定されているだけではデプロイ完了を意味しません。実際の公開状態と閲覧権限は Sites の結果を確認してください。Sites 用ファイルは GitHub Pages の配信には影響しません。

`taronagata.com` はまだ購入していません。次のステップはドメイン管理サービスで空き状況と料金を確認して取得し、[設定ガイド](docs/DOMAIN-SETUP.ja.md) に沿って接続することです。

## 出典と権利

本人から提供された最新版 CV、既存の公開プロフィール、公開研究リポジトリ、確認できた論文情報をもとにしています。論文 Figure 9 は CC BY 4.0 に基づき、切り抜きと出典を明記して掲載しています。書体の OFL ライセンスも素材と一緒に保存しています。詳しくは [出典一覧](docs/CONTENT-SOURCES.md) を参照してください。
