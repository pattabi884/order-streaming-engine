import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';

import { SLA_QUEUE, NOTIFICATIONS_QUEUE } from './sla.constants';
import { SlaSchedulerService } from './sla.scheduler.service';
import { SlaProcessor } from './sla.processor';
import { SlaConsumer } from './sla.consumer';
import { SlaBreach } from '../entities/sla-breach.entity';

@Module({
  imports: [
    KafkaModule,
    TypeOrmModule.forFeature([SlaBreach]),
    BullModule.registerQueue(
      { name: SLA_QUEUE },
      { name: NOTIFICATIONS_QUEUE },
    ),
  ],
  providers: [SlaSchedulerService, SlaProcessor, SlaConsumer],
  exports: [SlaSchedulerService],
})
export class SlaModule {}
