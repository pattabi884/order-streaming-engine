import { z } from 'zod';
export const OrderCreatedSchema = z.object({
    eventType: z.literal('ORDER_CREATED'),
    orderId: z.string().uuid(),
    merchantId: z.string(),
    customerId: z.string(),

    items: z.array(z.any()),
    estimatedDeliveryMinutes: z.number(),
    timestamp: z.number(),
});