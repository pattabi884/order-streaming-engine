import { z } from 'zod';
export const OrderCreatedSchema = z.object({
    eventType: z.literal('CREATED'),
    orderId: z.string().uuid(),
    merchantId: z.string(),
    customerId: z.string(),

    items: z.array(z.any()),
    estimatedDeliveryMinutes: z.number(),
    timestamp: z.number(),
});

export const OrderEventBaseSchema = z.object({
  eventType: z.string(),        // what happened
  orderId:   z.string().uuid(), // which order
  timestamp: z.number(),        // when
});