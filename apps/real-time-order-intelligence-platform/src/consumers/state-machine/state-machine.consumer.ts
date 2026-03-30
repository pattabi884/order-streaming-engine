import { KafkaProducerService } from "@app/kafka/kafka-producer.service";
import { RedisService } from "@app/redis";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Consumer, Kafka } from "kafkajs";
import { Order } from "../../entities/order.entity";
import { Repository } from "typeorm";
import { OrderStateHistory } from "../../entities/order-state-history.entity";
import { OrderCreatedSchema, OrderEventBaseSchema } from "@app/schemas/order.schema";
import { ALLOWED_TRANSITIONS } from "./transitions";



@Injectable()
export class StateMachineConsumer implements OnModuleInit{
    private consumer: Consumer;

    constructor(
        @Inject('KAFKA_INSTANCE') private readonly kafka: Kafka,
        private readonly redisService: RedisService,
        private readonly kafkaProducer: KafkaProducerService,
        @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
        @InjectRepository(OrderStateHistory) private readonly stateHistoryRepository: Repository<OrderStateHistory> 
    ){}

    async onModuleInit() {
        this.consumer = this.kafka.consumer({
            groupId: 'state-machine-consumer',
        });
        
        await this.consumer.connect()
        console.log('state machine consumer is connected');

        await this.consumer.subscribe({
            topic: 'order.lifecycle',
            fromBeginning: true,
        });
        
        await this.consumer.run({
            autoCommit: false,
            eachMessage: async({ topic, partition, message }) => {
                console.log('recived raw message offset', message.offset);
              await this.processEvent(topic, partition, message);
            }
        });      

    }
    private async processEvent(topic: string, partition: number, message: any) {
        
        //step 1 conver from buffer to json 
        if(!message.value){
           await this.commitOffset(topic, partition, message);
            return;
        }
        const raw = message.value.toString();

        let parsedEvent: any;

        try{ 
            parsedEvent = JSON.parse(raw)
        } catch(err){
            
            //invalid json DLQ 
            await this.commitOffset(topic, partition, message);
            return;
        }

        //step 2 zod validation

        const result = OrderEventBaseSchema.safeParse(parsedEvent);
        if (!result.success) {
            await this.publishToDLQ(message, 'failed base zod validation');
            await this.commitOffset(topic, partition, message);  
         return;
}
        const event = result.data;
        const { orderId, eventType, timestamp } = event;

//step 3 handel wen evnt type is created

        if(eventType === 'CREATED') {
            await this.handleOrderCreated(parsedEvent, topic, partition, message);
            //commit off set is handeled inside the handelr function
            return;
        }

        //step 4 redis set and retrive part 
        const redisKey = `order:${orderId}:state`;
        let currentState = await this.redisService.get(redisKey);

        if(!currentState) {
            const order = await this.orderRepository.findOne({
                where: { order_id: orderId},
            });
        
        if(!order){
            //ghost event --> DLQ
            await this.publishToDLQ(message, 'order not found', orderId);
            await this.commitOffset(topic, partition, message); 
            return;
        }
        currentState = order.state;

    
         await this.redisService.set(
            redisKey, 
            currentState, 
             3600// dont knwo or havent decided the exact time yet
         );
    }
    const allowedNextStates = ALLOWED_TRANSITIONS[currentState] ?? [];
    const isValid = allowedNextStates.includes(eventType);

    if(!isValid){
        //invalid --> DLQ
        await this.publishToDLQ(message, 'invlalid transition', orderId);
        await this.commitOffset(topic, partition, message); 
        return;
    }
    //step 6 thw idempotent db update query builder 

    const updateResult = await this.orderRepository
        .createQueryBuilder()
        .update(Order)
        .set({
            state: eventType,
        })
        .where("order_id = :orderId", { orderId })
        .andWhere("state = :currentState", { currentState })
        .execute();

        if (updateResult.affected === 0){
             //alredy processed 
            await this.commitOffset(topic, partition, message);            
            return;
        }

        const stateHistoryRow = this.stateHistoryRepository.create({
            order: {order_id: orderId },
            from_state: currentState,
            to_state: eventType,
        });

        await this.stateHistoryRepository.save(stateHistoryRow)


        await this.redisService.set(
            redisKey,
            eventType,
            3600
        );
        if (eventType === 'CONFIRMED') {
            //todo sechudel SLA jobs (BullMq later)
        }

        await this.commitOffset(topic, partition, message); 
        
        


    }
    private async handleOrderCreated(
        event: any,
        topic: string,
        partition: number,
        message: any
    ){
        const orderId = event?.orderId ?? 'unknown';
        const result = OrderCreatedSchema.safeParse(event)
        if(!result.success){
            await this.publishToDLQ(message, 'Zod validation failed in handelOrderCreated', orderId);
            await this.commitOffset(topic, partition, message);
            return;
        }

        const data = result.data;
        const newOrder = this.orderRepository.create({
            order_id:                   data.orderId,
            customer:                   { user_id: data.customerId },
            merchant:                   { user_id: data.merchantId },
            items:                      data.items,
            estimated_delivery_minutes: data.estimatedDeliveryMinutes,
            state:                      'CREATED',
            fulfillment_mode:           'INSTANT',
});
        await this.orderRepository.save(newOrder)

        const historyRow = this.stateHistoryRepository.create({
        order: { order_id: data.orderId },  // relation — TypeORM needs the object shape
        from_state: null,
        to_state: 'CREATED',
        });
        await this.stateHistoryRepository.save(historyRow);
        await this.redisService.set(
            `order:${data.orderId}:state`,
            'CREATED',
            3600
        );
        await this.commitOffset(topic, partition, message); 
        
    }

    private async commitOffset(topic: string, partition: number, message: any){
        await this.consumer.commitOffsets([{
            topic, 
            partition,
            offset: (Number(message.offset) + 1).toString(),
        }])
    }

    private async publishToDLQ(message: any, reason: string, orderId: string = 'unknown'){
        await this.kafkaProducer.publish('order.dlq', orderId, {
            originalMessage: message.value?.toString(),
            reason,

        })
    }

}