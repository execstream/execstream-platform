import Redis from "ioredis";
import { config } from "./env.js"; // Your existing environment config

// Create a new ioredis instance.
// It will automatically connect to the URL from your .env file or the default.
// ioredis handles connection logic gracefully, so you don't need many event listeners.
const redisClient = new Redis(config.REDIS_URL || 'redis://127.0.0.1:6379', {
  lazyConnect: true
});

redisClient.on('error', (err) => console.error('🛑 Redis Connection Error', err));

export default redisClient;