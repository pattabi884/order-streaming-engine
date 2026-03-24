import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { KafkaModule } from '@app/kafka';

@Module({
  imports: [KafkaModule],
  /**
   * Important:
   * Without this, KafkaProducerService cannot be injected
   */

  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}