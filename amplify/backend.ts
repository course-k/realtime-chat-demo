import { defineBackend } from '@aws-amplify/backend';
import {
  RestApi,
  LambdaIntegration,
  AuthorizationType,
} from 'aws-cdk-lib/aws-apigateway';
import { data } from './data/resource';
import { lineWebhook } from './functions/line-webhook/resource';

const backend = defineBackend({
  data,
  lineWebhook,
});

/**
 * LINE の Webhook 受け口となる REST API。
 * LINE は IAM/Cognito の認可を通せないため POST /webhook は認可なし（NONE）。
 * 正当性は Lambda 内の署名検証で担保する。
 */
const apiStack = backend.createStack('line-webhook-api');

const webhookApi = new RestApi(apiStack, 'LineWebhookApi', {
  restApiName: 'line-webhook',
  deployOptions: { stageName: 'prod' },
});

webhookApi.root
  .addResource('webhook')
  .addMethod('POST', new LambdaIntegration(backend.lineWebhook.resources.lambda), {
    authorizationType: AuthorizationType.NONE,
  });

backend.addOutput({
  custom: {
    lineWebhookUrl: `${webhookApi.url}webhook`,
  },
});
