import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  SLA_QUEUE,
  SLA_JOB_WARNING,
  SLA_JOB_BREACH,
  SlaJobPayload,
} from './sla.constants';

type ScheduleInput = {
    orderId: string;
    estimatedDeliveryMinutes: number;
};

@Injectable()
export class SlaSchedulerService {
    constructor(
    @InjectQueue(SLA_QUEUE)
    private readonly slaQueue: Queue<SlaJobPayload>,
    ) {}

    async scheduleForConfirmed(input: ScheduleInput): Promise<void> {
        const totalMs = input.estimatedDeliveryMinutes * 60 * 1000;
        const warningDelayMs = Math.floor(totalMs * 0.8);
        const breachDelayMs = totalMs;

        const basePayload: SlaJobPayload = {
            orderId: input.orderId,
            estimatedDeliveryMinutes: input.estimatedDeliveryMinutes,
            scheduledAtMs: Date.now(),

        };
        await this.slaQueue.add(SLA_JOB_WARNING, basePayload, {
            delay: warningDelayMs,
            jobId: `sla:warn:${input.orderId}`,
            removeOnComplete: 10000,
            removeOnFail: 1000,
        });
        
        await this.slaQueue.add(SLA_JOB_BREACH, basePayload,{
            delay: breachDelayMs,
            jobId: `sla:breach:${input.orderId}`,
            removeOnComplete: 1000,
            removeOnFail: 1000,
        })
    }

}