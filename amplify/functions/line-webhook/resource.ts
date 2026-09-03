import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * LINE の Webhook を受け取る関数。
 * - 署名検証に channel secret、プロフィール取得に channel access token を使う
 * - 値はコミットせず、`npx ampx sandbox secret set <name>` で各自の環境に登録する
 */
export const lineWebhook = defineFunction({
  name: 'line-webhook',
  environment: {
    LINE_CHANNEL_SECRET: secret('LINE_CHANNEL_SECRET'),
    LINE_CHANNEL_ACCESS_TOKEN: secret('LINE_CHANNEL_ACCESS_TOKEN'),
  },
  timeoutSeconds: 15,
  // @line/bot-sdk v11 は Node.js 22 以上を要求する
  runtime: 22,
});
