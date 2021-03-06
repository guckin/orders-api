import {postOrderLambdaFactory} from './lambda/post-order-lambda';
import {storeOrderHandlerFactory} from './orders/store-order';
import {ISO8601DateTimeString} from './common/date-time';
import {v4} from 'uuid';
import {UUID} from './common/uuid';
import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {getOrderLambdaFactory} from './lambda/get-order-lambda';
import {readOrderHandlerFactory} from './orders/read-order';
import {ordersFactoryFactory} from './orders/orders-factory';
import {SNS} from 'aws-sdk';
import {recordProcessorLambdaFactory} from './lambda/record-processor-lambda';
import {patchOrderLambdaFactory} from './lambda/patch-order-lambda';
import {updateOrderHandlerFactory} from './orders/update-order';
import {authorizerLambdaFactory} from './lambda/authorizer-lambda';
import {tokenVerificationFactory} from './auth/token-verification';
import {verify} from 'jsonwebtoken';
import {JwksClient} from 'jwks-rsa';

const jwksClient = new JwksClient({jwksUri: 'https://dev--isxkzf0.auth0.com/.well-known/jwks.json'});
const verifyToken = tokenVerificationFactory({jwksClient, verify});
export const authorizer = authorizerLambdaFactory({verifyToken})

export const dynamo = new DocumentClient();

const tableName = process.env.TABLE_NAME ?? '';
const storeOrder = storeOrderHandlerFactory({
    dynamo,
    tableName
});
const now = () => new Date().toISOString() as ISO8601DateTimeString;
const uuid = () => v4() as UUID;
const ordersFactory = ordersFactoryFactory({
    now,
    uuid
});

export const postOrderLambda = postOrderLambdaFactory({
    storeOrder,
    ordersFactory
});

const readOrder = readOrderHandlerFactory({
    dynamo,
    tableName
});

export const getOrderLambda = getOrderLambdaFactory({readOrder});

const updateOrder = updateOrderHandlerFactory({
    dynamo,
    tableName
});

export const patchOrderLambda = patchOrderLambdaFactory({
    updateOrder
});

const sns = new SNS();
const orderStatusUpdateTopicArn = process.env.ORDER_STATUS_UPDATE_TOPIC ?? '';

export const recordProcessor = recordProcessorLambdaFactory({
    sns,
    orderStatusUpdateTopicArn
});
