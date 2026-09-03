# realtime-chat-demo

LINE で受け取ったメッセージを、AWS AppSync の GraphQL Subscription で
Web 画面にリアルタイム表示するデモ。

```
LINE ──Webhook──▶ API Gateway ──▶ Lambda ──(GraphQL mutation / IAM)──▶ AppSync ──▶ DynamoDB
                                  署名検証・整形・重複排除                  │
                                                                         └──Subscription(WebSocket)──▶ React (aws-amplify)
```

## 構成

| 登場人物 | 役割 |
| --- | --- |
| API Gateway | Webhook の受け口（`POST /webhook`、認可なし） |
| Lambda (`amplify/functions/line-webhook`) | 署名検証・重複排除・プロフィール取得・`Message` の作成 |
| AppSync | GraphQL API。mutation を起点に Subscription を配信 |
| DynamoDB | `Message` の保存先 |
| Amplify Gen2 | 上記 4 つを定義・デプロイ |
| React + `aws-amplify` | `observeQuery` で購読し、新着を最下部に表示 |

## 前提

- Node.js 20 以上
- AWS アカウント（デモ用の新規作成を推奨）
- AWS CLI
- LINE Messaging API チャネル（channel secret / channel access token を取得できること）

## セットアップ

以降の `ampx` コマンドは `--identifier` と `--profile` を毎回同じ値で指定する。

- `--identifier demo` … サンドボックスの名前。省略すると OS のユーザー名が使われ、
  CLI 出力やスタック名に個人名が出る。任意の値でよい。
- `--profile amplify-dev` … デプロイ用の AWS プロファイル。

### 1. 依存インストール

```bash
npm install
```

### 2. AWS プロファイル

`AmplifyBackendDeployFullAccess` を直接アタッチした IAM ユーザーのアクセスキーで
プロファイルを作成する。

```bash
aws configure --profile amplify-dev
# region は任意（例: ap-northeast-1）、output format は空で可
```

### 3. LINE のシークレットを登録

値は SSM Parameter Store に保存され、リポジトリには含まれない。

```bash
npx ampx sandbox secret set LINE_CHANNEL_SECRET --identifier demo --profile amplify-dev
npx ampx sandbox secret set LINE_CHANNEL_ACCESS_TOKEN --identifier demo --profile amplify-dev
```

### 4. バックエンドのデプロイ

```bash
npx ampx sandbox --identifier demo --profile amplify-dev
```

初回は CDK bootstrap が走る。完了すると `amplify_outputs.json` が生成される
（このターミナルは起動したままにする）。

### 5. Webhook URL を LINE に登録

`amplify_outputs.json` の `custom.lineWebhookUrl` が Webhook の URL。
LINE Developers コンソールの Messaging API 設定で Webhook URL に設定し、
「検証」で疎通を確認、Webhook の利用を ON にする。

### 6. フロントを起動

別ターミナルで:

```bash
npm run dev
```

表示された URL を複数のブラウザ／タブで開く。
スマホの LINE から公式アカウントにメッセージを送ると、全画面に即時表示される。

## 後片付け

```bash
npx ampx sandbox delete --identifier demo --profile amplify-dev
```

## メモ

- ブラウザ → AppSync は API キー認証（`amplify_outputs.json` に含まれる。`apiKeyAuthorizationMode.expiresInDays` で 30 日に設定）。
- Lambda → AppSync は IAM 認証（`amplify/data/resource.ts` 末尾の `allow.resource(lineWebhook)`）。
- シークレット（channel secret / access token）はリポジトリに含まれない。
  各自の環境に `ampx sandbox secret set` で登録する。
- `--identifier` を変えると別のサンドボックスが作られる。古い方は
  `npx ampx sandbox delete --identifier <旧identifier> --profile amplify-dev` で削除する。
