import { config } from "../configs/env.js";
import redisClient from "../configs/redis.js";

// Set a default TTL (Time To Live) for cache entries, e.g., 1 hour
const DEFAULT_EXPIRATION_SECONDS = config.REDIS_CACHE_TTL || 3600;

export const cacheMiddleware = () => async (req, res, next) => {
  // Create a unique cache key from the request's original URL to handle query params
  const userType = req.user ? req.user.role : "guest";
  const cacheKey = `cache:${userType}:${req.originalUrl}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`CACHE HIT for key: ${cacheKey}`);
      // Send the cached data and end the request
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log(`CACHE MISS for key: ${cacheKey}`);

    // Wrap the response method to capture the data before it's sent
    const originalJson = res.json;
    res.json = (data) => {
      if (res.statusCode === 200) {
        console.log(`CACHING data for key: ${cacheKey}`);
        // Store the fresh data in Redis with an expiration time
        redisClient.setex(
          cacheKey,
          DEFAULT_EXPIRATION_SECONDS,
          JSON.stringify(data)
        );
      }
      // Restore the original method and send the response
      res.json = originalJson;
      return res.json(data);
    };

    next();
  } catch (error) {
    console.error("Redis cache middleware error:", error);
    next(); // On error, bypass cache
  }
};
