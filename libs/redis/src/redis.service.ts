import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
//  *
//  * DESIGN CHOICE (IMPORTANT):
//  * - Errors are handled at LOW LEVEL (set/get/del)
//  * - Higher-level methods (setJson/getJson) DO NOT handle errors again
@Injectable()
export class RedisService implements OnModuleDestroy {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: 'localhost',
            port: 6379,
            retryStrategy: (times: number) => {
                console.warn(`Redis retry attempt ${times}`);             
                return Math.min(times * 50, 20000);
            },
        });
        //event succesful connection 
        this.client.on('connect', () => {
            console.log('redis connected');
        });
    
    //event connection closed 
        this.client.on('error', (err) => {
        console.error('redis connection error', err);
        });

    //event connection closed 
        this.client.on('close', () => {
        console.warn('redis connection closed')
        });
    }

 getClient(): Redis {
        return this.client
    }

 async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try{
        if(ttlSeconds && ttlSeconds > 0){
            await this.client.set(key, value, 'EX', ttlSeconds)
        }else{
            await this.client.set(key, value);
        }
    }catch(err){ 
        //never throw here as redis should never crash ur app 
        console.error('REDIS set error', err)
    }
    }
    async get(key: string): Promise<string | null> {
        try{ 
            return await this.client.get(key);
        }catch (err) {
            console.error('Redis get error', err);
            return null;
        }
    }
    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        }catch (err) {
            console.error('redis del error:', err);
        }
    }
    async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
       
            const serialized = JSON.stringify(value);
            await this.set(key, serialized, ttlSeconds);
           
        }
        
    
    //retrive json data 
    async getJson<T>(key: string): Promise<T | null>{
        try{
            const data = await this.get(key)
            return data ? (JSON.parse(data) as T) : null;
        } catch (err) {
            console.error('Redis GET JSON error', err);
            return null
        }

        }
        async onModuleDestroy() {
            try{
                await this.client.quit();
                console.log('Redis connection closed on shoutdown')
            } catch(err) {
                console.error('error closing redis connection:', err)
            }
        }
}