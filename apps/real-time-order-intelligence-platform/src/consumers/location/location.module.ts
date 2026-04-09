// location.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';

import { LocationConsumer } from './location.consumer';
import { LocationTrackingService } from './location-tracking.service';
import { AgentFlushService } from './agent-flush.service';
import { Agent } from '../../entities/agent.entity'; // TODO adjust path

@Module({
  imports: [
    KafkaModule,
    RedisModule,
    TypeOrmModule.forFeature([Agent]),
  ],
  providers: [
    LocationConsumer,
    LocationTrackingService,
    AgentFlushService,
  ],
  exports: [LocationTrackingService],
})
export class LocationModule {}
