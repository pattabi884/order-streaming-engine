import { z } from 'zod';
export const SlaBreachedSchema = z.object({
  eventType: z.literal('SLA_BREACHED'),
  orderId: z.string().uuid(),
  breachedAt: z.number().int().positive(),
  sourceJobId: z.string().optional(),
});
