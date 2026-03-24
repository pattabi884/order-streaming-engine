import { Inject, Injectable } from "@nestjs/common";
//import { KafkaProducerService } from "@app/kafka";
import { OrderCreatedSchema } from "@app/schemas/order.schema";
import { randomUUID } from "crypto";
import { KafkaProducerService } from "@app/kafka/kafka-producer.service";

@Injectable()
export class OrdersService { 
    constructor(private readonly kafkaProducer: KafkaProducerService) {}

    async createOrder(dto: any) {
        const event = {
            eventType: 'ORDER_CREATED',
            orderId: randomUUID(),
            merchantId: dto.merchantId,
            customerId: dto.customerId,
            items: dto.items,
            estimatedDeliveryMinutes: dto.estimatedDeliveryMinutes,
            timestamp: Date.now(),
        };
        const result = OrderCreatedSchema.safeParse(event);

        if(!result.success) {
            console.error('invlid evnet', result.error);
            throw new Error('invalid event structure');
        }
        await this.kafkaProducer.publish(
            'order.lifecycle',
            event.orderId,//partition key
            event
        );
        return { 
            orderId: event.orderId,
            status: 'accepted',
        };
    }
}