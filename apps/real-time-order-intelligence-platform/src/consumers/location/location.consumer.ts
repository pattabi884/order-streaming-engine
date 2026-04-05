import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { RedisService } from '@app/redis';
import { AgentLocationPingSchema } from '@app/schemas';
import { LocationTrackingService } from './location-tracking.service';
// import { KafkaProducerService } from '@app/kafka/kafka-producer.service'; // optional DLQ

@Injectable()
export class LocationConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;

  constructor(
    @Inject('KAFKA_INSTANCE') private readonly kafka: Kafka,
    // private readonly kafkaProducer: KafkaProducerService, // optional DLQ
    private readonly locationTrackingService: LocationTrackingService,
  ) {}

  async onModuleInit() {
    this.consumer = this.kafka.consumer({ groupId: 'location-consumer' });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'order.location',
      fromBeginning: false, // correct for live location
    });

    await this.consumer.run({
      autoCommit: false, // important: manual strategy
      eachMessage: async ({ topic, partition, message }) => {
        await this.processLocation(topic, partition, message);
      },
    });
  }

  async onModuleDestroy() {
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }

  private async processLocation(topic: string, partition: number, message: any) {
    // 1) poison: empty payload -> commit skip
    if (!message.value) {
      await this.commitOffset(topic, partition, message);
      return;
    }

    // 2) parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(message.value.toString());
    } catch {
      // poison: invalid JSON -> optionally DLQ -> commit
      // await this.publishInvalidToDlq('invalid-json', message);
      await this.commitOffset(topic, partition, message);
      return;
    }

    // 3) schema
    const result = AgentLocationPingSchema.safeParse(parsed);
    if (!result.success) {
      // poison: schema fail -> optionally DLQ -> commit
      // await this.publishInvalidToDlq('schema-failed', message, result.error.format());
      await this.commitOffset(topic, partition, message);
      return;
    }

    // 4) happy path: Redis pipeline
    const { agentId, lat, lng, status, timestamp } = result.data;

    // NOTE: geo commands are (lng, lat), not (lat, lng)
   await this.locationTrackingService.recordPing(result.data);

    // 5) commit only after successful write
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

  // Optional pattern if you later decide to use DLT
  // private async publishInvalidToDlq(reason: string, message: any, details?: unknown) {
  //   await this.kafkaProducer.publish('order.dlq', 'location', {
  //     reason,
  //     original: message.value?.toString(),
  //     details,
  //     at: Date.now(),
  //   });
  // }
}
