import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Consumer, Kafka } from 'kafkajs';
import { SlaBreachedSchema } from '@app/schemas';
import { SlaBreach } from '../entities/sla-breach.entity';
import { SLA_KAFKA_GROUP_ID, SLA_KAFKA_TOPIC } from './sla.constants';

@Injectable()
export class SlaConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;

  constructor(
    @Inject('KAFKA_INSTANCE') private readonly kafka: Kafka,
    @InjectRepository(SlaBreach)
    private readonly slaBreachRepository: Repository<SlaBreach>,
  ) {}

  async onModuleInit() {
    this.consumer = this.kafka.consumer({
      groupId: SLA_KAFKA_GROUP_ID,
    });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: SLA_KAFKA_TOPIC,
      fromBeginning: false,
    });

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        await this.processMessage(topic, partition, message);
      },
    });
  }

  async onModuleDestroy() {
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }

  private async processMessage(topic: string, partition: number, message: any) {
    if (!message.value) {
      await this.commitOffset(topic, partition, message);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(message.value.toString());
    } catch {
      await this.commitOffset(topic, partition, message);
      return;
    }

    const result = SlaBreachedSchema.safeParse(parsed);
    if (!result.success) {
      await this.commitOffset(topic, partition, message);
      return;
    }

    const { orderId, breachedAt, sourceJobId } = result.data;

    const breach = this.slaBreachRepository.create({
      order: { order_id: orderId } as any,
      breached_at: new Date(breachedAt),
      source_job_id: sourceJobId ?? null,
    });

    try {
      await this.slaBreachRepository.save(breach);
    } catch (err) {
      const isDuplicate =
        err instanceof QueryFailedError &&
        (err as any).driverError?.code === '23505';

      if (!isDuplicate) {
        throw err;
      }
    }

    await this.commitOffset(topic, partition, message);
  }

  private async commitOffset(topic: string, partition: number, message: any) {
    await this.consumer.commitOffsets([
      {
        topic,
        partition,
        offset: (Number(message.offset) + 1).toString(),
      },
    ]);
  }
}
