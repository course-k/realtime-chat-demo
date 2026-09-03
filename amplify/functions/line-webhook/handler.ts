import type { APIGatewayProxyHandler } from 'aws-lambda';
import { validateSignature, messagingApi, webhook } from '@line/bot-sdk';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/line-webhook';
import type { Schema } from '../../data/resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});

/**
 * LINE からの Webhook を受け取り、テキストメッセージを Message モデルに保存する。
 * 1. 署名を検証（LINE 以外からの POST を弾く）
 * 2. text メッセージ以外のイベントは無視
 * 3. lineWebhookEventId が既に保存済みなら再送とみなしてスキップ
 * 4. 送信者のプロフィール（表示名・アイコン）を取得して作成
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const body = event.body ?? '';
  // LINE は署名を x-line-signature ヘッダー（小文字）で送る
  const signature = event.headers['x-line-signature'] ?? '';

  if (!validateSignature(body, env.LINE_CHANNEL_SECRET, signature)) {
    return { statusCode: 401, body: 'invalid signature' };
  }

  const { events } = JSON.parse(body) as webhook.CallbackRequest;
  await Promise.all(events.map(handleEvent));

  // 個々のイベント処理結果によらず、LINE には常に 200 を返す
  return { statusCode: 200, body: 'ok' };
};

async function handleEvent(event: webhook.Event): Promise<void> {
  if (event.type !== 'message') return;
  const message = event.message;
  if (message.type !== 'text') return;
  if (event.source?.type !== 'user' || !event.source.userId) return;

  const senderId = event.source.userId;

  // Webhook 再送による重複を防ぐ。
  // 厳密にはアトミックではないが、LINE の再送間隔的にこれで十分。
  const existing = await client.models.Message.get({
    lineWebhookEventId: event.webhookEventId,
  });
  if (existing.data) return;

  const profile = await lineClient.getProfile(senderId).catch(() => null);

  const { errors } = await client.models.Message.create({
    lineWebhookEventId: event.webhookEventId,
    text: message.text,
    senderId,
    displayName: profile?.displayName,
    pictureUrl: profile?.pictureUrl,
  });

  if (errors) {
    console.error('failed to create message', errors);
  }
}
