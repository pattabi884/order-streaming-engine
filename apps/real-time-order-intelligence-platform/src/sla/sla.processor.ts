import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka/kafka-producer.service';
import {
  SLA_JOB_BREACH,
  SLA_JOB_WARNING,
  SLA_KAFKA_TOPIC,
  SLA_QUEUE,
  SlaJobPayload,
} from './sla.constants';

@Processor(SLA_QUEUE)
export class SlaProcessor extends WorkerHost {
  constructor(
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {
    super();
  }

  async process(job: Job<SlaJobPayload>): Promise<void> {
    const { orderId } = job.data;

    if (job.name !== SLA_JOB_WARNING && job.name !== SLA_JOB_BREACH) {
      return;
    }

    if (job.name === SLA_JOB_WARNING) {
      return;
    }

    const currentState = await this.redisService.get(`order:${orderId}:state`);
    if (currentState === 'DELIVERED' || currentState === 'CANCELLED') {
      return;
    }

    await this.kafkaProducer.publish(SLA_KAFKA_TOPIC, orderId, {
      eventType: 'SLA_BREACHED',
      orderId,
      breachedAt: Date.now(),
      sourceJobId: job.id ? String(job.id) : undefined,
    });
  }
}
