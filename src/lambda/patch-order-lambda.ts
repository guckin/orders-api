import {APIGatewayProxyHandlerV2} from 'aws-lambda';
import {array, object, ObjectSchema, string} from 'joi';
import {Order, OrderStatus, OrderStatuses} from '../orders/order';
import {isUUID} from '../common/uuid';
import {
    createResponse,
    errorInternalServerError,
    errorOrderNotFound,
    errorOrdersIdInvalid,
    errorPayloadIsInvalid,
    errorPayloadIsNotJson
} from './common-responses';
import {parseJson} from '../common/json';
import {isSuccess} from '../common/result';
import {OrderUpdate, UpdateOrderFailure, UpdateOrderHandler} from '../orders/update-order';
import {APIGatewayProxyResultV2} from 'aws-lambda/trigger/api-gateway-proxy';

export type PatchOrderLambdaDependencies = {
    readonly updateOrder: UpdateOrderHandler;
};

export const patchOrderLambdaFactory = (
    {
        updateOrder
    }: PatchOrderLambdaDependencies
): APIGatewayProxyHandlerV2 => async ({pathParameters, body}) => {
    const id = pathParameters?.id;
    if (!isUUID(id)) return errorOrdersIdInvalid(id);
    const jsonParseResult = parseJson(body)
    if (!isSuccess(jsonParseResult)) return errorPayloadIsNotJson(body);
    if (!payloadIsValid(jsonParseResult.value)) return errorPayloadIsInvalid(jsonParseResult.value);
    const updates = jsonParseResult.value.changes.map(deserializeOrderUpdate);
    const updateResult = await updateOrder(id, updates);
    if (!isSuccess(updateResult)) return errorFailureUpdatingOrder(updateResult.error)
    return successfullyUpdatedOrder(updateResult.value);
};

export type UpdateOrderPayload = {
    readonly changes: OrderPatchJson[]
};

export type OrderPatchJson = OrderStatusReplacePatchJson;

export type OrderStatusReplacePatchJson = {
    readonly op: 'replace';
    readonly path: '/status';
    readonly value: OrderStatus;
};

const orderStatusReplaceValidation: ObjectSchema<OrderStatusReplacePatchJson> = object({
    op: string().valid('replace').required(),
    path: string().valid('/status').required(),
    value: string().valid(...OrderStatuses).required()
});

const payloadIsValid = (value: unknown): value is UpdateOrderPayload => {
    const validation = object({
        changes: array().items(
            orderStatusReplaceValidation
        ).unique((a, b) => a.path === b.path).required()
    });
    const {error} = validation.validate(value);
    return !error;
};

const errorFailureUpdatingOrder = (failure: UpdateOrderFailure): APIGatewayProxyResultV2 => ({
    [UpdateOrderFailure.ItemNotFound]: () => errorOrderNotFound(),
    [UpdateOrderFailure.UnknownFailure]: () => errorInternalServerError()
})[failure]();

const deserializeOrderUpdate = ({value}: OrderPatchJson): OrderUpdate => ({
    field: 'status',
    value
});

const successfullyUpdatedOrder = (order: Order): APIGatewayProxyResultV2 => createResponse({
    json: order,
    status: 200
});
