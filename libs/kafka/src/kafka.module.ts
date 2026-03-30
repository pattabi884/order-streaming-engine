import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { KafkaProducerService } from './kafka-producer.service';

@Module({
  providers: [
    {
      provide: 'KAFKA_INSTANCE',    // a token, like a name tag
      useFactory: () => {
        return new Kafka({
          clientId: 'orders-pipeline',
          brokers: ['localhost:9092'],
        });
      },
    },
    KafkaProducerService,
  ],
  exports: ['KAFKA_INSTANCE', KafkaProducerService],
})
export class KafkaModule implements OnModuleInit {

  constructor(@Inject('KAFKA_INSTANCE') private readonly kafka: Kafka) {}
  async onModuleInit() {
    const admin = this.kafka.admin();

    try { 
      await admin.connect();
      console.log('admin connected');

      await admin.createTopics({
        waitForLeaders: true,
        validateOnly: false,
        topics: [
          { topic: 'order.lifecycle', numPartitions: 6, replicationFactor: 1 },
          { topic: 'order.assignment', numPartitions: 3, replicationFactor: 1 },
          { topic: 'order.location', numPartitions: 12, replicationFactor: 1 },
          { topic: 'order.fulfillment', numPartitions: 3, replicationFactor: 1 },
          { topic: 'order.sla', numPartitions: 3, replicationFactor: 1 },
          { topic: 'payment.events', numPartitions: 3, replicationFactor: 1 },
          { topic: 'order.dlq', numPartitions: 1, replicationFactor: 1 },
        ]
      });
      console.log('topics ensured/created succesfully')
    } catch (error) {
      console.error('error creating topics', error);

    } finally { 
      await admin.disconnect();
      console.log('kafak admin disconnected ')
    }
  }
 
}
