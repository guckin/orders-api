import {NewOrder, Order, OrderStatus} from './order';
import {UUID} from '../common/uuid';
import {ISO8601DateTimeString} from '../common/date-time';

export type OrdersFactoryDependencies = {
    readonly uuid: () => UUID;
    readonly now: () => ISO8601DateTimeString;
};
export type OrdersFactory = (partialOrder: Pick<Order, 'items'>) => NewOrder;

export const ordersFactoryFactory = ({uuid, now}: OrdersFactoryDependencies): OrdersFactory => ({items}) => ({
    items,
    id: uuid(),
    createdWhen: now(),
    status: OrderStatus.Created
});
