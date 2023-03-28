import uuid from 'uuid-random';
import {StorageService} from "./service.js";
import {Redis} from "ioredis";

export class RedisStorageService implements StorageService {

    private client: Redis;

    constructor() {
        let pw = process.env.REDIS_PASSWORD;
        if (!pw) {
            throw new Error("REDIS_PASSWORD environment variable not set");
        }
        this.client = new Redis({
            host: 'fly-flashpaper-redis.upstash.io',
            port: 6379,
            username: 'default',
            password: pw,
            family: 6
        });
    }

    generateUuid(): string {
        return uuid();
    }

    async getMessage(id: string): Promise<string | undefined> {
        let value = await this.client.getset(id, "");
        if (!value) {
            return;
        }
        await this.client.del(id);
        return value;
    }

    async storeMessage(id: string, message: string, ttlMillis: number): Promise<void> {
        await this.client.set(id, message, 'PX', ttlMillis);
    }
}
