import { z } from 'zod';
import { AGENT_STATUS } from './agent.status.constants';
const AgentStatusSchema = z.enum([
  AGENT_STATUS.AVAILABLE,
  AGENT_STATUS.ON_DELIVERY,
  AGENT_STATUS.OFFLINE,
]);

//kafka message contract for topic: order.location 

export const AgentLocationPingSchema = z.object({
    //event discriminator
    eventType: z.literal('AGENT_LOCATION_PING'),
    agentId: z.string().uuid(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),

    status: AgentStatusSchema,
    timestamp: z.number().int().positive(),
});


export type AgentLocationPing = z.infer<typeof AgentLocationPingSchema>;



