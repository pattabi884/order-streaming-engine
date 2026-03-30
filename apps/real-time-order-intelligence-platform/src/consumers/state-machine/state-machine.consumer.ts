import { KafkaProducerService } from '@app/kafka/kafka-producer.service';
import { RedisService } from '@app/redis';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderStateHistory } from '../../entities/order-state-history.entity';
import { Consumer, Kafka } from 'kafkajs';
import { OrderEventBaseSchema } from '@app/schemas/order.schema';
import { ALLOWED_TRANSITIONS } from './transitions';
@Injectable()
export class StateMachineConsumer implements OnModuleInit {
  private consumer: Consumer;

  constructor(
    @Inject('KAFKA_INSTANCE') private readonly kafka: Kafka,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderStateHistory)
    private readonly historyRepository: Repository<OrderStateHistory>,
  ) {}

  async onModuleInit() {
    this.consumer = this.kafka.consumer({
      groupId: 'state-machine-consumer',
    });

    await this.consumer.connect();

    await this.consumer.subscribe({
      topic: 'order.lifecycle',
      fromBeginning: true,
    });

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        console.log('received raw message offset:', message.offset);

        await this.processEvent(topic, partition, message);
      },
    });
  }

  private async processEvent(
    topic: string,
    partition: number,
    message: any,
  ) {
    // =========================
    // STEP 1: Parse message
    // =========================
    const raw = message.value?.toString();
    if (!raw) return;

    const event = JSON.parse(raw);

    // =========================
    // STEP 2: Zod validation
    // =========================
    const result = OrderEventBaseSchema.safeParse(event);

    if (!result.success) {
      await this.publishToDLQ(message, 'failed zod validation');
      await this.commitOffset(topic, partition, message);
      return;
    }

    // 🔥 THIS is where orderId comes from
    // Zod validated data → safe structure
    const { orderId, eventType } = result.data;

// ORDER_CREATED is special — order doesn't exist yet
// hand it off to a separate handler
    if (eventType === 'CREATED') {
    await this.handleOrderCreated(event);
    await this.commitOffset(topic, partition, message);
    return;
    }

    // =========================
    // STEP 3: Get current state
    // Redis → Postgres fallback
    // =========================

    const redisKey = `order:${orderId}:state`;

    // try Redis first
    let currentState = await this.redisService.get(redisKey);

    // cache miss → go to DB
    if (!currentState) {
      const order = await this.orderRepository.findOne({
        where: { order_id: orderId },
      });

      // order doesn't exist → invalid event
      if (!order) {
        await this.publishToDLQ(message, 'order not found');
        await this.commitOffset(topic, partition, message);
        return;
      }

      currentState = order.state;

      // 🔥 IMPORTANT: backfill Redis cache
      await this.redisService.set(redisKey, currentState, 3600);
    }
      // step 4: check valid transitions
    const allowedNextStates = ALLOWED_TRANSITIONS[currentState];
  const incomingState = event.eventType; // same thing now

  if (!allowedNextStates || !allowedNextStates.includes(incomingState)) {
  await this.publishToDLQ(message, `invalid transition: ${currentState} → ${incomingState}`);
  await this.commitOffset(topic, partition, message);
  return;
}
    // (you’ll use currentState next for transition logic)
  }

  private async commitOffset(
    topic: string,
    partition: number,
    message: any,
  ) {
    await this.consumer.commitOffsets([
      {
        topic,
        partition,
        offset: (Number(message.offset) + 1).toString(),
      },
    ]);
  }

  private async publishToDLQ(message: any, reason: string, orderId: string = 'unknown') {
  await this.kafkaProducer.publish('order.dlq', orderId, {
    originalMessage: message.value?.toString(),
    reason,
  });
}
}