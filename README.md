# Taro Nagata — Personal Website

Taro Nagata / 永田 多朗のパーソナルサイト。研究、制作物、関心、連絡先を紹介する、英語を主言語とした日英対応の静的ウェブサイトです。

白・青を基盤にした研究・技術中心のデザインで、昼夜テーマと日英切り替えに対応しています。HTML・CSS・JavaScript のみで動作し、npm のインストールは不要です。完成した静的ファイルは `dist/` にあります。

## ファイル

| 場所 | 内容 |
| --- | --- |
| `dist/index.html` | 本文、プロフィール、作品、リンク、日英テキスト |
| `dist/research.html` | 論文の問い・手法・結果・Figure 9・限界 |
| `dist/space-weather.html` | Space Weather Project の観測とモデル |
| `dist/nobilva.html` | NOBILVA のAI開発・活動・公式ロゴ |
| `dist/thy-and-i.html` | Thy & I のサービス・ウェブ開発・公式ロゴ |
| `content/details.json` | 詳細4ページの日英コンテンツ |
| `scripts/render-detail-pages.py` | 詳細ページを生成するPythonスクリプト |
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

トップは `dist/index.html` の本文を編集します。詳細4ページは `content/details.json` を編集し、`python3 scripts/render-detail-pages.py` でHTMLを生成します。`data-en` と `data-ja` が付いた要素は、両方の言語を更新してください。外部リンク、所属、年、数値も同時に確認します。CV を差し替える場合は `dist/assets/` 内の PDF と HTML のリンク先を一致させます。

動きを加えるときは、動きを減らす OS 設定とサイト内の停止操作を維持してください。公開前にスマートフォン幅、日英切り替え、昼夜テーマ、キーボード操作、連絡先・CV のリンクを確認します。

## GitHub に保存・公開する

保存先は [tarofractal/tarofractal.github.io](https://github.com/tarofractal/tarofractal.github.io) です。今回の変更は `personal-site-2026` ブランチからレビューできる形にし、既存サイトへの反映は PR のマージで行います。

長期の公開先には GitHub Pages を使用できます。GitHub Actions が `dist/` を配信する設定にします。公開設定と `taronagata.com` の接続は [独自ドメイン設定ガイド](docs/DOMAIN-SETUP.ja.md) に記載しています。

Sites の本人用確認ページ：<https://taro-nagata-observatory.tarofractal.chatgpt.site>。2026年11月15日に本人だけが閲覧できる設定で配信成功を確認しました。Sites 用ファイルは GitHub Pages の配信には影響しません。ブラウザによる表示確認は環境上の制限により未実施です。

`taronagata.com` はまだ購入していません。次のステップはドメイン管理サービスで空き状況と料金を確認して取得し、[設定ガイド](docs/DOMAIN-SETUP.ja.md) に沿って接続することです。

## 検証

```sh
python3 scripts/check-site.py
node --check dist/app.js
```

ローカルのリンク、アンカー、CSS素材、日英テキスト、PDF・図の形式と JavaScript 構文を確認できます。

## 出典と権利

本人から提供された最新版 CV、既存の公開プロフィール、公開研究リポジトリ、確認できた論文情報をもとにしています。論文 Figure 9 は CC BY 4.0 に基づき、切り抜きと出典を明記して掲載しています。書体の OFL ライセンスも素材と一緒に保存しています。NOBILVAとThy & Iのロゴは本人の希望に沿って各公式サイトの配信素材を使用し、出典を `docs/brand-assets.json` に記録しています。Tモノグラムは本サイト用に作成したSVGです。詳しくは [出典一覧](docs/CONTENT-SOURCES.md) を参照してください。
