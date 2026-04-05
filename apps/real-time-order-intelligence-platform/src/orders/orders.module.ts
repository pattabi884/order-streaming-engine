import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KafkaModule } from '@app/kafka';

import { Order } from '../entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [KafkaModule, TypeOrmModule.forFeature([Order])],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
