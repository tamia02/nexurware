
import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not defined in .env');
}

export const redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    keepAlive: 30000, // 30s
    connectTimeout: 15000, // 15s
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});
