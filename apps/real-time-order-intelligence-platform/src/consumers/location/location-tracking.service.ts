import { Injectable } from "@nestjs/common";
import { RedisService } from "@app/redis";
import { AgentLocationPing, AgentLocationPingSchema } from "@app/schemas";
import { AGENT_STATUS } from "@app/schemas/agent.status.constants";

type FindNearestInput = {
    lat: number;
    lng: number;
    radiusKm?: number;
    maxCandidates?: number;
};

type NearestAgent = {
    agentId: string;
    distanceKm: number;
};

@Injectable()
export class LocationTrackingService {
    private readonly GEO_KEY = 'active:agents';
    private readonly ALIVE_TTL_SECONDS = 30;
    private readonly STATE_TTL_SECONDS = 120;
    private readonly LAST_TS_TTL_SECONDS = 120;

    constructor(private readonly redisService: RedisService) {}

    async recordPing(ping: AgentLocationPing): Promise<void> {
        const redis = this.redisService.getClient();
        const pipeline = redis.pipeline();

        pipeline.geoadd(this.GEO_KEY, ping.lng, ping.lat, ping.agentId);
        pipeline.set(`agent:${ping.agentId}:alive`, '1', 'EX', this.ALIVE_TTL_SECONDS);
        pipeline.set(`agent:${ping.agentId}:state`, ping.status, 'EX', this.STATE_TTL_SECONDS);
        pipeline.set(`agent:${ping.agentId}:last_ts`, String(ping.timestamp), 'EX', this.LAST_TS_TTL_SECONDS)

        const results = await pipeline.exec()
        if(!results) throw new Error('redi pipeline failed: null result');
        if(results.some(([err]) => err)) throw new Error('Redis pipeline failed: command error');
        
    }

    async findNearestAvailableAgent(input: FindNearestInput): Promise<NearestAgent | null> {
        const redis = this.redisService.getClient();
        const radiusKm = input.radiusKm ?? 3;
        const maxCandidates = input.maxCandidates ?? 20;

         // nearest query pattern (ioredis-safe via CALL)
const raw = (await redis.call(
  'GEOSEARCH',
  this.GEO_KEY,
  'FROMLONLAT', input.lng, input.lat,
  'BYRADIUS', radiusKm, 'km',
  'WITHDIST',
  'ASC',
  'COUNT', maxCandidates,
)) as Array<[string, string]>;


    if(!raw || raw.length === 0) return null;

    const candidates = (raw as [string, string][]).map(([agentId, dist]) => ({
      agentId,
      distanceKm: Number(dist),
    }));

    const pipeline = redis.pipeline();
    for (const c of candidates) {
      pipeline.get(`agent:${c.agentId}:alive`);
      pipeline.get(`agent:${c.agentId}:state`);
    }

    const checks = await pipeline.exec();
    if (!checks) throw new Error('Redis check pipeline failed: null result');
    if (checks.some(([err]) => err)) throw new Error('Redis check pipeline failed: command error');

    for (let i = 0; i < candidates.length; i++) {
      const alive = checks[i * 2]?.[1];
      const state = checks[i * 2 + 1]?.[1];

      if (alive === '1' && state === AGENT_STATUS.AVAILABLE) {
        return candidates[i]; // first match is nearest because ASC
      }
    }

    return null;
  }
}