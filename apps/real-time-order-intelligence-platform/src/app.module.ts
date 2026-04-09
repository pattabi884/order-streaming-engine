import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { OrdersModule } from './orders/orders.module';
import { StateMachineModule } from './consumers/state-machine/state-machine.module';
import { Order } from './entities/order.entity';
import { OrderStateHistory } from './entities/order-state-history.entity';
import { User } from './entities/user.entity';
import { Agent } from './entities/agent.entity';
import { Merchant } from './entities/merchant.entity';
import { AuthModule } from './auth/auth.module';
import { LocationModule } from './consumers/location/location.module';
import { ScheduleModule } from '@nestjs/schedule';
//import { OrdersModule } from './modules/orders/orders.module';
//import { StateMachineModule } from './modules/state-machine/state-machine.module';
import { BullModule } from '@nestjs/bullmq';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'pattabi',
      database: 'order_pipeline_db',
      entities: [Order, OrderStateHistory, User, Agent, Merchant],
      synchronize: false,
      logging: true,
      
    }),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),


    RedisModule,
    KafkaModule,
    OrdersModule,
    StateMachineModule,
    AuthModule,
    LocationModule,
    ScheduleModule.forRoot(),
  ],
})
export class AppModule {}