import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { lineWebhook } from '../functions/line-webhook/resource';

/**
 * メッセージ 1 件を表すモデル。
 * - ブラウザ: API キーで read（get / list / listen(購読) を含む）
 * - line-webhook 関数: IAM で書き込み（スキーマ末尾の allow.resource で付与）
 * - lineWebhookEventId を識別子にして、LINE の Webhook 再送による重複を防ぐ
 */
const schema = a
  .schema({
    Message: a
      .model({
        lineWebhookEventId: a.string().required(),
        text: a.string().required(),
        senderId: a.string().required(),
        displayName: a.string(),
        pictureUrl: a.string(),
      })
      .identifier(['lineWebhookEventId'])
      .authorization((allow) => [allow.publicApiKey().to(['read'])]),
  })
  .authorization((allow) => [allow.resource(lineWebhook).to(['mutate'])]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
