import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

//import { Order } from '../entities/order.entity';
//import { OrderStateHistory } from '../entities/order-state-history.entity';

import { StateMachineConsumer } from './state-machine.consumer';
import { KafkaModule } from '@app/kafka';
import { OrderStateHistory } from '../../entities/order-state-history.entity';
import { Order } from '../../entities/order.entity';
import { SlaModule } from '../../sla/sla.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStateHistory,
    ]),
    KafkaModule,
    SlaModule,
  ],
  providers: [
    StateMachineConsumer, 
  ],
})
export class StateMachineModule {}