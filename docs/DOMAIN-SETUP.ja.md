# taronagata.com を GitHub Pages に接続する

このガイドは、コードを GitHub で管理し、GitHub Pages から `taronagata.com` を配信するための手順です。本人の回答では、ドメインはまだ購入していません。最初に空き状況と料金を確認して取得します。

## 1. ドメインを用意する

Cloudflare Registrar などのドメイン管理サービスで `taronagata.com` を検索し、空き状況・初年度料金・更新料金を確認して取得します。料金や取得可能性は購入画面で確認してください。

購入には本人の連絡先、規約への同意、支払いが必要です。管理画面のパスワードやカード情報をチャットに送る必要はありません。Cloudflare Registrar で購入するドメインは Cloudflare のネームサーバーを利用します。

公式手順：[Cloudflare でドメインを登録する](https://developers.cloudflare.com/registrar/get-started/register-domain/)

## 2. コードを反映し、GitHub Pages を設定する

1. [リポジトリ](https://github.com/tarofractal/tarofractal.github.io) で `personal-site-2026` ブランチの PR を確認し、公開する内容に問題がなければ `main` にマージします。
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
3. **Actions** タブで Pages のデプロイが成功していることを確認します。必要なら Pages ワークフローを手動実行します。配信対象は `dist/` です。
4. まず <https://tarofractal.github.io/> を開き、表示と言語切り替え、CV、外部リンクを確認します。

既存サイトが公開されている場合、PR をマージしてデプロイすると新しい内容へ切り替わります。

## 3. ドメイン所有権を検証する

GitHub アカウントの **Settings → Pages → Add a domain** で `taronagata.com` を追加します。GitHub に表示された TXT レコードの名前と値を、ドメイン管理サービスの DNS 設定にそのまま追加し、GitHub 側で検証します。

TXT の値はアカウントごとに異なります。このガイドの例から値を作らず、実際の画面の指定を使ってください。検証後も TXT レコードを残します。

公式手順：[GitHub Pages の独自ドメインを検証する](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)

## 4. GitHub に独自ドメインを設定する

リポジトリの **Settings → Pages → Custom domain** に `taronagata.com` を入力して **Save** します。その後で、次の DNS レコードを設定します。

GitHub Actions で公開する場合、`dist/CNAME` ファイルだけでは独自ドメインの設定は完了しません。Pages の設定画面で指定してください。

## 5. DNS を設定する

ドメイン管理サービスで、次のレコードを追加します。`@` は `taronagata.com` 自体を表します。サービスによっては名前欄を空にするか、ドメイン名全体を入力します。

| 種類 | 名前 | 値 |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `tarofractal.github.io` |

CNAME の値には `https://` や末尾のパスを付けません。TTL は通常、管理サービスの既定値で構いません。Cloudflare では、接続確認と証明書発行が完了するまでは上記レコードを **DNS only** にすると確認しやすくなります。

同じホスト名に古い転送先や駐車ページ用の A・AAAA・CNAME がある場合は、今回の設定と競合しないように整理します。メール用の MX レコードや、所有権検証用の TXT レコードは保持してください。`*` のワイルドカードレコードは追加しません。

## 6. HTTPS と接続を確認する

1. DNS の反映を待ちます。GitHub の案内では最大 24 時間かかる場合があります。
2. **Settings → Pages** の DNS チェックを確認します。
3. 証明書の準備が整ったら **Enforce HTTPS** を有効にします。この選択肢が利用可能になるまで最大 24 時間かかる場合があります。
4. `https://taronagata.com` と `https://www.taronagata.com` を開きます。両方が同じサイトへ到達し、ブラウザに証明書エラーがないことを確認します。
5. サイトに canonical URL、サイトマップ、OG 画像の絶対 URL を設定する場合は、接続できた正式ドメインにそろえます。

確認コマンドの例です。`dig` がある環境で使用できます。

```sh
dig taronagata.com A +short
dig www.taronagata.com CNAME +short
curl -I https://taronagata.com
```

公式手順：[GitHub Pages の独自ドメインを管理する](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## 公開後の更新

`dist/` の内容を編集して `main` に反映すると、Pages のワークフローで更新します。ドメインの更新期限と支払い方法も確認し、自動更新を設定しておくと失効を防げます。

Sites を独自ドメインの公開先に選ぶ場合は、上の GitHub Pages 用 DNS 値を使いません。Sites 側でドメインを登録し、返された検証レコードと接続先を使用します。同じドメインの公開先は一つに決めて設定してください。
