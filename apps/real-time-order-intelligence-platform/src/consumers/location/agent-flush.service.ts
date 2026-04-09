import { RedisService } from '@app/redis';
import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository  } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../../entities/agent.entity';
import { AgentStatus } from '@app/schemas/agent.status.constants';
import { UUID } from 'crypto';
import { agent } from 'supertest';
import { throwError } from 'rxjs';


type AgentSnapshotRow = {
    user_id: string;// i have name this as suer_id in the agent entity 
    current_lat: number;
    current_lng: number;
    status: AgentStatus;
    last_location_at: Date;
};

@Injectable()
export class AgentFlushService {
    private readonly logger = new Logger(AgentFlushService.name);
    private readonly GEO_KEY = 'active:agents';

    constructor(
        private readonly redisService: RedisService,
        @InjectRepository(Agent)
        private readonly agentRepo: Repository<Agent>,
    ) {}
    @Cron(CronExpression.EVERY_MINUTE)
    async flushRedisToPostgress(): Promise<void> {
        const redis = this.redisService.getClient();
        
        const agentIds = (await redis.zrange(this.GEO_KEY, 0, -1)) as string[];

        if(!agentIds.length){
            this.logger.debug('no active agents found in geoset; Flush skipped');
            return;
        }
        //the redis pipeline for each agent we fetch geops + state + last_ts
        const p = redis.pipeline();
//build the pieline 
        for (const agentId of agentIds)  {
            p.geopos(this.GEO_KEY, agentId);
            p.get(`agent:${agentId}:state`);
            p.get(`agent:${agentId}:last_ts`);
        }

        //one network round trip 
        const replies = await p.exec();

        if(!replies){
            throw new Error('Agent flush read pipeline failed: null result');

        }
        if(replies.some(([err]) => err)) {
            throw new Error('agnet flush read pipeline failed: command error');
        }
        const rows: AgentSnapshotRow[] = [];

        for(let i = 0; i < agentIds.length; i++){
            const agentId = agentIds[i];
            const base = i * 3;
            const geoRaw = replies[base]?.[1] as [string, string][] | null;
            const stateRaw = replies[base +1]?.[1] as string | null;
            const tsRaw = replies[base + 2]?.[1] as string | null;
            //this skips stale / basd enetred 

            const point = Array.isArray(geoRaw) ? geoRaw[0] : null;
            
            if(!point || !stateRaw || !tsRaw) continue;

            const lng = Number(point[0]);
            const lat = Number(point[1]);
            const timestampNum = Number(tsRaw);
            
            if(!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(timestampNum)){
                continue;
            }
          
      // Optional: keep only known statuses
      if (stateRaw !== 'AVAILABLE' && stateRaw !== 'ON_DELIVERY' && stateRaw !== 'OFFLINE') {
        continue;
      }

      rows.push({
        user_id: agentId, // TODO: align with entity PK/unique column
        current_lat: lat,
        current_lng: lng,
        status: stateRaw,
        last_location_at: new Date(timestampNum),
      });
    }

    if (!rows.length) {
      this.logger.debug(`Flush finished: no valid rows from ${agentIds.length} agent ids`);
      return;
    }

    // 5) Persist in bulk (upsert preferred).
  
    await this.agentRepo.upsert(rows, ['user_id']);

    this.logger.log(`Flushed ${rows.length}/${agentIds.length} agent snapshots to Postgres`);
  }

}