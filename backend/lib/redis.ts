import IORedis, {Redis, RedisOptions} from "ioredis";
import url from "url";
import uuid from 'uuid-random';
import {StorageService} from "./service";

export class RedisStorageService implements StorageService {

    private client: Redis;

    constructor() {
        let u = process.env.REDIS_URL;
        if (!u) {
            throw new Error("Redis URL environment variable not set");
        }
        let redis_uri = url.parse(u);
        let options: RedisOptions = {
            port: Number(redis_uri.port),
            host: redis_uri.hostname || undefined,
            password: (redis_uri.auth ? redis_uri.auth.split(':')[1] : undefined),
            db: 0,
        };
        this.client = new IORedis(options);
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
