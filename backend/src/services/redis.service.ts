
import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not defined in .env');
}

export const redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});
