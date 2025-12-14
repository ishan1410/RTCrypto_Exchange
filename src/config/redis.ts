import Redis from "ioredis";
import dotenv from "dotenv";
import { MockRedis } from "./MockRedis";

dotenv.config();

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const isMock = process.env.MOCK_MODE === "true";

const RedisClass = isMock ? MockRedis : Redis;

// @ts-ignore
export const redis = new RedisClass(redisPort, redisHost);

// @ts-ignore
export const pub = new RedisClass(redisPort, redisHost);
// @ts-ignore
export const sub = new RedisClass(redisPort, redisHost); // For subscribing to keyspace events if needed

redis.on("connect", () => {
    console.log(`Connected to Redis (Mock: ${isMock})`);
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});
