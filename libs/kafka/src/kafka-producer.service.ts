import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KafkaModule } from './kafka.module';
import { MESSAGES } from '@nestjs/core/constants';

//kafka producer service 

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
    private producer: Producer;

    constructor( @Inject('KAFKA_INSTANCE') private readonly kafka: Kafka){}
async onModuleInit() {
    //const kafka = this.kafkaModule.getKakfaInstance();
    this.producer = this.kafka.producer();

    await this.producer.connect();
    console.log('kafka producer connected');
}
async onModuleDestroy(){
    await this.producer.disconnect();
    console.log('kafka producer is disconnected');

}
async publish(topic: string, key: string, message: any) {
    const value = JSON.stringify(message);

    await this.producer.send({
        topic, 
        messages: [
            {
                key,
                value,
            },
        ],
    });
    console.log(`message sent to ${topic}`);
}

}