# Taro Nagata — Personal Website

Taro Nagata / 永田 多朗のパーソナルサイト。研究、制作物、関心、連絡先を紹介する、英語を主言語とした日英対応の静的ウェブサイトです。

白・青を基盤にした研究・技術中心のデザインで、昼夜テーマと日英切り替えに対応しています。HTML・CSS・JavaScript のみで動作し、npm のインストールは不要です。編集用の静的ファイルは `dist/` にあり、GitHub Pages の既存設定に合わせてルートにも同期しています。

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
| `dist/app.js` | 日英切り替え、テーマ切り替え、動きの制御、写真の拡大表示 |
| `dist/fractals.js` | 14種類のフラクタルの逐次生成アニメーション |
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

## トップの写真スライドショー

トップの自己紹介に5枚の写真を組み込み、約5秒ごとに1.1秒の穏やかなクロスフェードで切り替えます。写真の縦横比と署名を保ち、ズームや自動スクロールは使っていません。スマートフォンでは名前・自己紹介の下に写真のスライドショーを表示します。

一時停止・写真の直接選択・左右キー・クリックでの拡大に対応。キーボードで操作を始めると自動再生を止め、画面外や別タブでも切り替えを休止します。OSの「動きを減らす」設定では静止表示から始まります。日英・昼夜テーマにも対応しています。写真は `dist/assets/gallery/`、本文と代替テキストは `dist/index.html`、切り替え処理は `dist/app.js` にあります。

## 背景のフラクタル

トップの背景では、次の14種類を、この順番で1種類ずつ生成します。

ドラゴン曲線、マンデルブロ集合、メンガーのスポンジ、コッホ曲線、シェルピンスキーのギャスケット、バーンズリーのシダ、ジュリア集合、ヒルベルト曲線、ピタゴラスの木、レヴィC曲線、バーニングシップ・フラクタル、ヴィチェック・フラクタル、ニュートン・フラクタル、カントールの塵。

約9〜10秒かけて構築し、完成形を1.4秒表示してから消え、次の生成が始まります。複数のフラクタルは同時に表示しません。ロマネスコは含みません。青・シアン・紫などを形に合わせて組み合わせ、曲線には滑らかなグラデーション、集合には反復回数による色の変化を使っています。

`dist/fractals.js` にCanvasの描画処理があります。再帰的な細分化・折り畳み、複素数の反復、ニュートン法、反復関数系などを使用しています。画像素材や外部ライブラリは使っていません。背景は自己紹介の列に固定し、デスクトップでは最大700pxまで拡大しながら、写真のスライドショーとの間に余白を確保しています。

初回は6回折り畳んだドラゴン曲線をすぐに表示し、そこからさらに細かく生成します。JavaScriptを読み込む前やCanvasが使えない場合も、同じ形のSVGを表示します。昼のテーマでも見えるように線幅と色のコントラストを調整しています。

写真の再生ボタンで背景の生成も一時停止・再開できます。画面外・別タブ・写真の拡大表示中には背景の描画を休止します。OSの「動きを減らす」設定では完成形の静止表示となります。日英・昼夜テーマとスマートフォンの表示に対応しています。

## 内容を更新する

トップは `dist/index.html` の本文を編集します。詳細4ページは `content/details.json` を編集し、`python3 scripts/render-detail-pages.py` でHTMLを生成します。`data-en` と `data-ja` が付いた要素は、両方の言語を更新してください。外部リンク、所属、年、数値も同時に確認します。CV を差し替える場合は `dist/assets/` 内の PDF と HTML のリンク先を一致させます。

動きを加えるときは、動きを減らす OS 設定とサイト内の停止操作を維持してください。ルートへ同期したあと、公開前にスマートフォン幅、日英切り替え、昼夜テーマ、キーボード操作、連絡先・CV のリンクを確認します。

## GitHub に保存・公開する

保存先は [tarofractal/tarofractal.github.io](https://github.com/tarofractal/tarofractal.github.io) です。公開URLは **https://tarofractal.github.io/** です。インターン応募で提出済みのURLを維持するため、既存の GitHub Pages 設定（`main` ブランチの `/`）を使います。

更新するときは `dist/` を編集し、次のコマンドで公開用ルートへ同期してから `main` に反映します。GitHub Pages が自動で更新されます。

```sh
python3 scripts/render-detail-pages.py
python3 scripts/publish-root.py
```

Pages の配信元を GitHub Actions へ変更する必要はありません。将来の `taronagata.com` 接続は [独自ドメイン設定ガイド](docs/DOMAIN-SETUP.ja.md) に記載しています。

Sites の本人用確認ページ：<https://taro-nagata-observatory.tarofractal.chatgpt.site>。2026年11月15日に本人だけが閲覧できる設定で配信成功を確認しました。Sites 用ファイルは GitHub Pages の配信には影響しません。2026年11月19日の背景更新では、ブラウザで昼夜テーマ、生成の進行、一時停止、スマートフォン幅の表示を確認しています。

`taronagata.com` はまだ購入していません。次のステップはドメイン管理サービスで空き状況と料金を確認して取得し、[設定ガイド](docs/DOMAIN-SETUP.ja.md) に沿って接続することです。

## 検証

```sh
python3 scripts/check-site.py
node --check dist/app.js
node --check dist/fractals.js
node scripts/check-fractal-start.cjs
```

ローカルのリンク、アンカー、CSS素材、日英テキスト、PDF・図の形式と JavaScript 構文を確認できます。

## 出典と権利

本人から提供された最新版 CV、既存の公開プロフィール、公開研究リポジトリ、確認できた論文情報をもとにしています。論文 Figure 9 は CC BY 4.0 に基づき、切り抜きと出典を明記して掲載しています。書体の OFL ライセンスも素材と一緒に保存しています。NOBILVAとThy & Iのロゴは本人の希望に沿って各公式サイトの配信素材を使用し、出典を `docs/brand-assets.json` に記録しています。Tモノグラムは本サイト用に作成したSVGです。詳しくは [出典一覧](docs/CONTENT-SOURCES.md) を参照してください。

最新版レジュメPDFは、本人が公開GitHubと公開サイトでの配布を明示的に承認したものを掲載しています。
