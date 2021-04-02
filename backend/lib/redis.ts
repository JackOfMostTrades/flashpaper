import IORedis, {Redis} from "ioredis";
import uuid from 'uuid-random';
import {StorageService} from "./service";

export class RedisStorageService implements StorageService {

    private client: Redis;

    constructor() {
        let u = process.env.REDIS_TLS_URL;
        if (!u) {
            throw new Error("Redis URL environment variable not set");
        }
        this.client = new IORedis(u);
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
