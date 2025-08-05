import redisClient from '../configs/redis.js';

/**
 * Deletes all keys matching a given prefix.
 * WARNING: The 'KEYS' command can be slow on large production datasets.
 */
export const clearCacheByPrefix = async (prefix) => {
  try {
    const matchPattern = `cache:*${prefix}*`;
    const stream = redisClient.scanStream({
        match: matchPattern,
        count: 100,
    });
    const keys = [];
    for await (const key of stream) {
        keys.push(key);
    }
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cache cleared for keys with prefix: ${matchPattern}`);
    }
  } catch (error) {
    console.error(`Error clearing cache for prefix ${prefix}:`, error);
  }
};

/**
 * Deletes a single, specific cache key.
 */
export const clearCacheByKey = async (key) => {
    const cacheKey = `cache:${key}`;
    try {
        await redisClient.del(cacheKey);
        console.log(`Cache cleared for key: ${cacheKey}`);
    } catch (error) {
        console.error(`Error clearing specific cache key ${cacheKey}:`, error);
    }
}