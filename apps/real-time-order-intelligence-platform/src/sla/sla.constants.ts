export const SLA_QUEUE = 'sla-checks';
export const NOTIFICATIONS_QUEUE = 'notifications';

export const SLA_JOB_WARNING = 'sla-warning';
export const SLA_JOB_BREACH = 'sla-breach';

export const SLA_KAFKA_TOPIC = 'order.sla';
export const SLA_KAFKA_GROUP_ID = 'sla-consumer';

export type SlaJobType = typeof SLA_JOB_WARNING | typeof SLA_JOB_BREACH;

export type SlaJobPayload = {
  orderId: string;
  estimatedDeliveryMinutes: number;
  scheduledAtMs: number;
};
