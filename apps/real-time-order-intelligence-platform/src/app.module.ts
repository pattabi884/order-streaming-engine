import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Kafka } from 'kafkajs';
import { KafkaModule } from '@app/kafka';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    KafkaModule,
    OrdersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
