import { Redis } from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
};

export const redisConnection = new Redis(redisConfig);
