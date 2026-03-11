import Redis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";

// ==================== REDIS PROVIDER CONFIGURATION ====================
const REDIS_PROVIDER = process.env.REDIS_PROVIDER || "none"; // "upstash" | "railway" | "none"

let redisClient = null;
let redisEnabled = false;
let redisInitPromise = null;
let currentProvider = REDIS_PROVIDER;

// ==================== PROVIDER INITIALIZATION ====================
try {
  console.log(`🔧 Initializing Redis with provider: ${REDIS_PROVIDER}`);

  if (REDIS_PROVIDER === "upstash") {
    // Upstash Redis (REST API)
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (restUrl && restToken) {
      redisClient = new UpstashRedis({
        url: restUrl,
        token: restToken,
        enableAutoPipelining: false,
      });

      redisInitPromise = redisClient
        .ping()
        .then(() => {
          console.log("✅ Connected to Upstash Redis (REST)");
          redisEnabled = true;
          return true;
        })
        .catch((err) => {
          console.warn("⚠️ Failed to connect to Upstash Redis:", err.message);
          console.log("Using in-memory fallback for storage");
          redisEnabled = false;
          return false;
        });
    } else {
      console.log("⚠️ Upstash credentials missing — using in-memory fallback");
    }
  } else if (REDIS_PROVIDER === "railway") {
    // Railway Redis (Standard Redis Protocol)
    const redisUrl = process.env.RAILWAY_REDIS_URL;

    if (redisUrl && !redisUrl.includes("[YOUR_RAILWAY_HOST]")) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redisInitPromise = redisClient
        .ping()
        .then(() => {
          console.log("✅ Connected to Railway Redis");
          redisEnabled = true;
          return true;
        })
        .catch((err) => {
          console.warn("⚠️ Failed to connect to Railway Redis:", err.message);
          console.log("Using in-memory fallback for storage");
          redisEnabled = false;
          return false;
        });

      // Handle connection events
      redisClient.on("error", (err) => {
        console.error("❌ Redis connection error:", err);
        redisEnabled = false;
      });

      redisClient.on("connect", () => {
        console.log("🔄 Redis connecting...");
      });

      redisClient.on("ready", () => {
        console.log("✅ Redis ready");
        redisEnabled = true;
      });
    } else {
      console.log(
        "⚠️ Railway Redis URL missing or not configured — using in-memory fallback",
      );
    }
  } else {
    console.log("ℹ️ No Redis provider selected — using in-memory fallback");
  }
} catch (error) {
  console.error("❌ Failed to initialize Redis:", error);
  redisEnabled = false;
  console.log("Using in-memory fallback for storage");
}

// ==================== PROVIDER ADAPTER LAYER ====================
// Unified interface that handles differences between Upstash and Railway

const redisAdapter = {
  /**
   * Get value from Redis (handles JSON parsing for Railway)
   */
  async get(key) {
    if (!redisClient) return null;

    if (currentProvider === "upstash") {
      // Upstash auto-handles JSON
      return await redisClient.get(key);
    } else {
      // Railway returns string, need to parse
      const data = await redisClient.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return data; // Return as-is if not JSON
      }
    }
  },

  /**
   * Set value in Redis with TTL (handles JSON serialization)
   */
  async set(key, value, ttl) {
    if (!redisClient) return;

    const serializedValue = JSON.stringify(value);

    if (currentProvider === "upstash") {
      // Upstash expects object directly
      await redisClient.set(key, value, { ex: ttl });
    } else {
      // Railway needs string
      await redisClient.setex(key, ttl, serializedValue);
    }
  },

  /**
   * Delete keys
   */
  async del(...keys) {
    if (!redisClient || keys.length === 0) return;
    await redisClient.del(...keys);
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!redisClient) return 0;
    return await redisClient.exists(key);
  },

  /**
   * Ping Redis
   */
  async ping() {
    if (!redisClient) return null;
    return await redisClient.ping();
  },

  /**
   * List push (used for messages)
   */
  async lpush(key, value) {
    if (!redisClient) return;

    if (currentProvider === "upstash") {
      await redisClient.lpush(key, value);
    } else {
      await redisClient.lpush(key, JSON.stringify(value));
    }
  },

  /**
   * List trim
   */
  async ltrim(key, start, stop) {
    if (!redisClient) return;
    await redisClient.ltrim(key, start, stop);
  },

  /**
   * List range
   */
  async lrange(key, start, stop) {
    if (!redisClient) return [];

    const messages = await redisClient.lrange(key, start, stop);

    if (currentProvider === "railway") {
      // Parse JSON strings for Railway
      return messages.map((msg) => {
        try {
          return JSON.parse(msg);
        } catch {
          return msg;
        }
      });
    }

    return messages;
  },

  /**
   * Sorted set add
   */
  async zadd(key, score, member) {
    if (!redisClient) return;

    if (currentProvider === "upstash") {
      await redisClient.zadd(key, { score, member });
    } else {
      await redisClient.zadd(key, score, member);
    }
  },

  /**
   * Sorted set range by score
   */
  async zrangebyscore(key, min, max) {
    if (!redisClient) return [];

    if (currentProvider === "upstash") {
      return await redisClient.zrange(key, min, max, { byScore: true });
    } else {
      return await redisClient.zrangebyscore(key, min, max);
    }
  },

  /**
   * Sorted set remove
   */
  async zrem(key, member) {
    if (!redisClient) return;
    await redisClient.zrem(key, member);
  },

  /**
   * Hash set
   */
  async hset(key, data) {
    if (!redisClient) return;
    await redisClient.hset(key, data);
  },

  /**
   * Hash get all
   */
  async hgetall(key) {
    if (!redisClient) return {};
    return await redisClient.hgetall(key);
  },

  /**
   * Hash get single field
   */
  async hget(key, field) {
    if (!redisClient) return null;
    return await redisClient.hget(key, field);
  },

  /**
   * Set expiry
   */
  async expire(key, seconds) {
    if (!redisClient) return;
    await redisClient.expire(key, seconds);
  },

  /**
   * Create pipeline (Railway only, Upstash doesn't support)
   */
  pipeline() {
    if (currentProvider === "railway" && redisClient) {
      return redisClient.pipeline();
    }
    // Return a mock pipeline for Upstash
    return {
      zadd: () => {},
      hset: () => {},
      expire: () => {},
      del: () => {},
      exec: async () => {},
    };
  },

  /**
   * Scan stream (Railway only, for pattern deletion)
   */
  scanStream(options) {
    if (currentProvider === "railway" && redisClient) {
      return redisClient.scanStream(options);
    }
    // Return empty stream for Upstash
    const EventEmitter = require("events");
    const stream = new EventEmitter();
    setTimeout(() => stream.emit("end"), 0);
    return stream;
  },
};

// Helper to ensure Redis is initialized before operations
async function ensureRedisReady() {
  if (redisInitPromise) {
    try {
      await redisInitPromise;
    } catch (e) {
      console.warn("Failed to initialize Redis promise");
    }
    // Only null it out if initialization worked or failed decisively
    redisInitPromise = null;
  }
  return redisEnabled && redisClient !== null;
}

// Check Redis status
export const checkRedisStatus = async () => {
  const isReady = await ensureRedisReady();
  if (!isReady) return false;

  try {
    const result = await redisAdapter.ping();
    return result === "PONG";
  } catch (error) {
    console.error("Redis check status error:", error);
    return false;
  }
};

// Export provider info for debugging
export const getRedisInfo = () => ({
  provider: currentProvider,
  enabled: redisEnabled,
  hasClient: !!redisClient,
});

// In-memory fallbacks for when Redis is not available
const inMemoryStore = {
  onlineUsers: new Map(),
  messages: new Map(),
  cache: new Map(), // generic cache with TTL
};

// Namespaced key prefixes — brocode-{entity}-{id}
const KEYS = {
  // User-related
  USER_PROFILE: (userId) => `brocode-user-${userId}`,
  USER_STATS: (userId) => `brocode-user-${userId}-stats`,
  USER_DASHBOARD_STATS: (userId) => `brocode-dashboard-stats-${userId}`,
  USER_PRESENCE: (userId) => `brocode-user-${userId}-presence`,

  // Group-related
  GROUP: (groupId) => `brocode-group-${groupId}`,
  GROUP_MEMBERS: (groupId) => `brocode-group-${groupId}-members`,
  GROUP_ONLINE: (groupId) => `brocode-group-${groupId}-online`,
  GROUP_MESSAGES: (groupId) => `brocode-group-${groupId}-messages`,
  GROUPS_LIST: (filters) => `brocode-groups-list-${filters}`,

  // Challenge-related
  CHALLENGE: (challengeId) => `brocode-challenge-${challengeId}`,
  CHALLENGE_LEADERBOARD: (challengeId) =>
    `brocode-challenge-${challengeId}-leaderboard`,
  CHALLENGE_MESSAGES: (challengeId) =>
    `brocode-challenge-${challengeId}-messages`,

  // Problem-related
  PROBLEM: (problemId) => `brocode-problem-${problemId}`,
  PROBLEMS_LIST: (filters) => `brocode-problems-list-${filters}`,

  // Submission-related
  USER_SUBMISSIONS: (userId) => `brocode-user-${userId}-submissions`,
};

// Default TTLs (in seconds)
const TTL = {
  USER_PROFILE: 300, // 5 minutes
  USER_STATS: 180, // 3 minutes
  GROUP: 86400, // 24 hours (invalidated on mutations)
  GROUPS_LIST: 300, // 5 minutes (invalidated on create/update)
  CHALLENGE: 180, // 3 minutes
  LEADERBOARD: 60, // 1 minute
  PROBLEM: 3600, // 1 hour (problems rarely change)
  PROBLEMS_LIST: 3600, // 1 hour (invalidated on problem updates)
  ALL_PROBLEMS: 3600, // 1 hour for full list
  MESSAGES: 1800, // 30 minutes
  ONLINE_USERS: 300, // 5 minutes
};

// Export TTL for use in other modules
export { TTL };

// Generic cache helpers
export const cache = {
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      // Ensure Redis is ready
      const isReady = await ensureRedisReady();
      console.log(
        `[Redis] get() called for key: ${key.substring(0, 60)}..., isReady: ${isReady}`,
      );

      if (!isReady || !redisClient) {
        const hit = inMemoryStore.cache.get(key);
        if (hit && Date.now() < hit.expiresAt) {
          return hit.data;
        }
        inMemoryStore.cache.delete(key);
        return null;
      }

      // Use adapter to get data (handles JSON parsing automatically)
      const data = await redisAdapter.get(key);
      if (data) {
        console.log(`[Redis] Cache HIT: ${key}`);
        return data;
      }
      return null;
    } catch (error) {
      console.error(`[Redis] Get error for ${key}:`, error);
      return null;
    }
  },

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async set(key, value, ttl = 300) {
    try {
      // Ensure Redis is ready
      const isReady = await ensureRedisReady();
      console.log(
        `[Redis] set() called for key: ${key.substring(0, 60)}..., isReady: ${isReady}, TTL: ${ttl}s`,
      );

      if (!isReady || !redisClient) {
        console.log(`[Redis] Not ready, using in-memory for key: ${key}`);
        inMemoryStore.cache.set(key, {
          data: value,
          expiresAt: Date.now() + ttl * 1000,
        });
        return;
      }

      console.log(`[Redis] Setting cache key: ${key} with TTL: ${ttl}s`);

      // Ensure value is JSON-serializable
      let cleanValue;
      try {
        // Convert to JSON and back to ensure all data is serializable
        cleanValue = JSON.parse(JSON.stringify(value));
        const preview = JSON.stringify(cleanValue).substring(0, 200);
        console.log(`[Redis] Data preview:`, preview);
      } catch (stringifyError) {
        console.error(`[Redis] JSON stringify error:`, stringifyError);
        throw new Error(`Failed to serialize value for key ${key}`);
      }

      // Use adapter to set data (handles serialization automatically)
      await redisAdapter.set(key, cleanValue, ttl);
      console.log(`[Redis] Set result: OK`);

      // Verify the key was set
      const verification = await redisAdapter.exists(key);
      console.log(`[Redis] Verification - key exists:`, verification);
      console.log(`[Redis] ✓ Successfully cached: ${key}`);
    } catch (error) {
      console.error(`[Redis] Set error for ${key}:`, error);
    }
  },

  /**
   * Delete cached data
   * @param {string|string[]} keys - Cache key(s) to delete
   */
  async del(...keys) {
    try {
      // Ensure Redis is ready
      const isReady = await ensureRedisReady();

      if (!isReady || !redisClient) {
        keys.forEach((key) => inMemoryStore.cache.delete(key));
        return;
      }

      if (keys.length > 0) {
        await redisAdapter.del(...keys);
        console.log(`[Redis] ✓ Deleted keys:`, keys);
      }
    } catch (error) {
      console.error(`[Redis] Del error:`, error);
    }
  },

  /**
   * Delete all keys matching a pattern (use carefully!)
   * @param {string} pattern - Pattern to match (e.g., "brocode-user-*")
   */
  async delPattern(pattern) {
    try {
      if (!redisEnabled) {
        // In-memory: delete all matching keys
        const keysToDelete = Array.from(inMemoryStore.cache.keys()).filter(
          (k) => k.includes(pattern.replace("*", "")),
        );
        keysToDelete.forEach((k) => inMemoryStore.cache.delete(k));
        return;
      }

      // Use adapter's scanStream (handles Railway vs Upstash differences)
      const stream = redisAdapter.scanStream({
        match: pattern,
        count: 100,
      });

      stream.on("data", async (keys) => {
        if (keys.length) {
          const pipeline = redisAdapter.pipeline();
          keys.forEach((key) => {
            pipeline.del(key);
          });
          await pipeline.exec();
        }
      });

      stream.on("end", () => {
        console.log(`[Redis] Pattern deletion complete for: ${pattern}`);
      });
    } catch (error) {
      console.error(`Redis delPattern error:`, error);
    }
  },
};

// Helper functions for specific entities
export const redisHelpers = {
  // ==================== USER CACHING ====================

  /**
   * Cache user profile data
   */
  async cacheUserProfile(userId, profileData) {
    try {
      console.log(`[redisHelpers] cacheUserProfile called for user: ${userId}`);
      await cache.set(KEYS.USER_PROFILE(userId), profileData, TTL.USER_PROFILE);
      console.log(`[redisHelpers] cacheUserProfile completed`);
    } catch (error) {
      console.error("[redisHelpers] cacheUserProfile error:", error);
      throw error;
    }
  },

  /**
   * Get cached user profile
   */
  async getUserProfile(userId) {
    try {
      console.log(`[redisHelpers] getUserProfile called for user: ${userId}`);
      const result = await cache.get(KEYS.USER_PROFILE(userId));
      console.log(
        `[redisHelpers] getUserProfile result:`,
        result ? "HIT" : "MISS",
      );
      return result;
    } catch (error) {
      console.error("[redisHelpers] getUserProfile error:", error);
      return null;
    }
  },

  /**
   * Invalidate user profile cache
   */
  async invalidateUserProfile(userId) {
    await cache.del(
      KEYS.USER_PROFILE(userId),
      KEYS.USER_STATS(userId),
      KEYS.USER_SUBMISSIONS(userId),
      KEYS.USER_DASHBOARD_STATS(userId),
    );
  },

  /**
   * Invalidate dashboard stats cache specifically
   */
  async invalidateDashboardStats(userId) {
    await cache.del(KEYS.USER_DASHBOARD_STATS(userId));
  },

  /**
   * Cache user stats (submissions, streak, etc.)
   */
  async cacheUserStats(userId, stats) {
    await cache.set(KEYS.USER_STATS(userId), stats, TTL.USER_STATS);
  },

  /**
   * Get cached user stats
   */
  async getUserStats(userId) {
    return await cache.get(KEYS.USER_STATS(userId));
  },

  // ==================== GROUP CACHING ====================

  /**
   * Cache group details
   */
  async cacheGroup(groupId, groupData) {
    await cache.set(KEYS.GROUP(groupId), groupData, TTL.GROUP);
  },

  /**
   * Get cached group
   */
  async getGroup(groupId) {
    return await cache.get(KEYS.GROUP(groupId));
  },

  /**
   * Invalidate group cache (call after updates)
   */
  async invalidateGroup(groupId) {
    await cache.del(KEYS.GROUP(groupId), KEYS.GROUP_MEMBERS(groupId));
  },

  /**
   * Cache groups list with filters
   */
  async cacheGroupsList(filters, groupsData) {
    try {
      const filterKey = JSON.stringify(filters);
      const cacheKey = KEYS.GROUPS_LIST(filterKey);
      console.log(
        `[redisHelpers] cacheGroupsList called with key: ${cacheKey.substring(0, 100)}...`,
      );
      await cache.set(cacheKey, groupsData, TTL.GROUPS_LIST);
      console.log(`[redisHelpers] cacheGroupsList completed`);
    } catch (error) {
      console.error("[redisHelpers] cacheGroupsList error:", error);
      throw error;
    }
  },

  /**
   * Get cached groups list
   */
  async getGroupsList(filters) {
    try {
      const filterKey = JSON.stringify(filters);
      const cacheKey = KEYS.GROUPS_LIST(filterKey);
      console.log(
        `[redisHelpers] getGroupsList called with key: ${cacheKey.substring(0, 100)}...`,
      );
      const result = await cache.get(cacheKey);
      console.log(
        `[redisHelpers] getGroupsList result:`,
        result ? "HIT" : "MISS",
      );
      return result;
    } catch (error) {
      console.error("[redisHelpers] getGroupsList error:", error);
      return null;
    }
  },

  /**
   * Invalidate all groups lists cache (call after group creation/deletion)
   */
  async invalidateAllGroupsLists() {
    try {
      console.log(`[redisHelpers] invalidateAllGroupsLists called`);
      // Since we can't easily pattern-match all filter combinations,
      // we'll use a pattern deletion for all groups-list keys
      await cache.delPattern("brocode-groups-list-*");
      console.log(`[redisHelpers] invalidateAllGroupsLists completed`);
    } catch (error) {
      console.error("[redisHelpers] invalidateAllGroupsLists error:", error);
    }
  },

  // ==================== CHALLENGE CACHING ====================

  /**
   * Cache challenge details
   */
  async cacheChallenge(challengeId, challengeData) {
    await cache.set(KEYS.CHALLENGE(challengeId), challengeData, TTL.CHALLENGE);
  },

  /**
   * Get cached challenge
   */
  async getChallenge(challengeId) {
    return await cache.get(KEYS.CHALLENGE(challengeId));
  },

  /**
   * Cache leaderboard data
   */
  async cacheLeaderboard(challengeId, leaderboardData) {
    await cache.set(
      KEYS.CHALLENGE_LEADERBOARD(challengeId),
      leaderboardData,
      TTL.LEADERBOARD,
    );
  },

  /**
   * Get cached leaderboard
   */
  async getLeaderboard(challengeId) {
    return await cache.get(KEYS.CHALLENGE_LEADERBOARD(challengeId));
  },

  /**
   * Invalidate challenge cache (call after updates/completions)
   */
  async invalidateChallenge(challengeId) {
    await cache.del(
      KEYS.CHALLENGE(challengeId),
      KEYS.CHALLENGE_LEADERBOARD(challengeId),
    );
  },

  // ==================== PROBLEM CACHING ====================

  /**
   * Cache problem details
   */
  async cacheProblem(problemId, problemData) {
    await cache.set(KEYS.PROBLEM(problemId), problemData, TTL.PROBLEM);
  },

  /**
   * Get cached problem
   */
  async getProblem(problemId) {
    return await cache.get(KEYS.PROBLEM(problemId));
  },

  /**
   * Cache problems list with filters
   */
  async cacheProblemsList(filters, problemsData) {
    try {
      const filterKey = JSON.stringify(filters);
      const cacheKey = KEYS.PROBLEMS_LIST(filterKey);
      console.log(
        `[redisHelpers] cacheProblemsList called with key: ${cacheKey.substring(0, 100)}...`,
      );
      await cache.set(cacheKey, problemsData, TTL.PROBLEMS_LIST);
      console.log(`[redisHelpers] cacheProblemsList completed`);
    } catch (error) {
      console.error("[redisHelpers] cacheProblemsList error:", error);
      throw error;
    }
  },

  /**
   * Get cached problems list
   */
  async getProblemsList(filters) {
    try {
      const filterKey = JSON.stringify(filters);
      const cacheKey = KEYS.PROBLEMS_LIST(filterKey);
      console.log(
        `[redisHelpers] getProblemsList called with key: ${cacheKey.substring(0, 100)}...`,
      );
      const result = await cache.get(cacheKey);
      console.log(
        `[redisHelpers] getProblemsList result:`,
        result ? "HIT" : "MISS",
      );
      return result;
    } catch (error) {
      console.error("[redisHelpers] getProblemsList error:", error);
      return null;
    }
  },

  /**
   * Invalidate problem cache (call after admin updates)
   */
  async invalidateProblem(problemId) {
    await cache.del(KEYS.PROBLEM(problemId));
    // Note: Also invalidate problems lists when a problem changes
  },

  /**
   * Cache all problems (no filters)
   */
  async cacheAllProblems(problemsData) {
    try {
      console.log(`[redisHelpers] cacheAllProblems called`);
      await cache.set("brocode-problems-all", problemsData, TTL.ALL_PROBLEMS);
      console.log(`[redisHelpers] cacheAllProblems completed`);
    } catch (error) {
      console.error("[redisHelpers] cacheAllProblems error:", error);
      throw error;
    }
  },

  /**
   * Get cached all problems
   */
  async getAllProblems() {
    try {
      console.log(`[redisHelpers] getAllProblems called`);
      const result = await cache.get("brocode-problems-all");
      console.log(
        `[redisHelpers] getAllProblems result:`,
        result ? "HIT" : "MISS",
      );
      return result;
    } catch (error) {
      console.error("[redisHelpers] getAllProblems error:", error);
      return null;
    }
  },

  /**
   * Invalidate all problems cache (call after admin updates)
   */
  async invalidateAllProblems() {
    await cache.del("brocode-problems-all");
  },

  // ==================== ONLINE USERS ====================

  /**
   * Add user to online users list for a group
   */
  async addOnlineUser(groupId, userId, userData) {
    try {
      if (!redisEnabled) {
        if (!inMemoryStore.onlineUsers.has(groupId)) {
          inMemoryStore.onlineUsers.set(groupId, new Map());
        }
        const groupUsers = inMemoryStore.onlineUsers.get(groupId);
        userData.lastActive = Date.now();
        groupUsers.set(userId, userData);
        return Array.from(groupUsers.entries()).map(([id, data]) => ({
          userId: id,
          ...data,
        }));
      }

      const key = KEYS.GROUP_ONLINE(groupId);
      const userPresenceKey = KEYS.USER_PRESENCE(userId);
      const timestamp = Date.now();

      // Use adapter for atomic operations
      const pipeline = redisAdapter.pipeline();
      await redisAdapter.zadd(key, timestamp, userId);

      // Flatten userData for hset
      const flatUserData = {
        ...userData,
        lastActive: timestamp.toString(),
        groupId: groupId.toString(),
      };
      await redisAdapter.hset(userPresenceKey, flatUserData);
      await redisAdapter.expire(userPresenceKey, TTL.ONLINE_USERS);
      await redisAdapter.expire(key, TTL.ONLINE_USERS);

      return await this.getOnlineUsers(groupId);
    } catch (error) {
      console.error("Redis addOnlineUser error:", error);
      return [];
    }
  },

  /**
   * Get online users in a group (active in last 5 minutes)
   */
  async getOnlineUsers(groupId) {
    try {
      if (!redisEnabled) {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const groupUsers = inMemoryStore.onlineUsers.get(groupId) || new Map();
        return Array.from(groupUsers.entries())
          .filter(([_, data]) => data.lastActive > fiveMinutesAgo)
          .map(([id, data]) => ({
            userId: id,
            ...data,
          }));
      }

      const key = KEYS.GROUP_ONLINE(groupId);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      // Use adapter (handles Upstash vs Railway differences)
      const userIds = await redisAdapter.zrangebyscore(
        key,
        fiveMinutesAgo,
        "+inf",
      );

      if (!userIds || userIds.length === 0) return [];

      const users = [];
      for (const userId of userIds) {
        const userData = await redisAdapter.hgetall(KEYS.USER_PRESENCE(userId));
        if (userData && Object.keys(userData).length > 0) {
          users.push({
            userId,
            ...userData,
            lastActive: parseInt(userData.lastActive),
          });
        }
      }

      return users;
    } catch (error) {
      console.error("Redis getOnlineUsers error:", error);
      return [];
    }
  },

  /**
   * Remove user from online list
   */
  async removeOnlineUser(groupId, userId) {
    try {
      if (!redisEnabled) {
        const groupUsers = inMemoryStore.onlineUsers.get(groupId);
        if (groupUsers) {
          groupUsers.delete(userId);
        }
        return;
      }

      const key = KEYS.GROUP_ONLINE(groupId);
      await redisAdapter.zrem(key, userId);
      await redisAdapter.del(KEYS.USER_PRESENCE(userId));
    } catch (error) {
      console.error("Redis removeOnlineUser error:", error);
    }
  },

  // ==================== MESSAGES CACHING ====================

  /**
   * Cache a message (stores last 100 messages)
   */
  async cacheMessage(groupId, message) {
    try {
      if (!redisEnabled) {
        if (!inMemoryStore.messages.has(groupId)) {
          inMemoryStore.messages.set(groupId, []);
        }
        const messages = inMemoryStore.messages.get(groupId);
        messages.unshift(message);
        if (messages.length > 100) {
          messages.pop();
        }
        return;
      }

      const key = KEYS.GROUP_MESSAGES(groupId);
      await redisAdapter.lpush(key, message);
      await redisAdapter.ltrim(key, 0, 99);
      await redisAdapter.expire(key, TTL.MESSAGES);
    } catch (error) {
      console.error("Redis cacheMessage error:", error);
    }
  },

  /**
   * Get recent messages for a group
   */
  async getRecentMessages(groupId, limit = 50) {
    try {
      if (!redisEnabled) {
        const messages = inMemoryStore.messages.get(groupId) || [];
        return messages.slice(0, limit);
      }

      const key = KEYS.GROUP_MESSAGES(groupId);
      const messages = await redisAdapter.lrange(key, 0, limit - 1);
      return messages;
    } catch (error) {
      console.error("Redis getRecentMessages error:", error);
      return [];
    }
  },

  /**
   * Cache challenge message (ephemeral)
   */
  async cacheChallengeMessage(challengeId, message) {
    try {
      if (!redisEnabled) return;

      const key = KEYS.CHALLENGE_MESSAGES(challengeId);
      await redisAdapter.lpush(key, message);
      await redisAdapter.ltrim(key, 0, 49);
      await redisAdapter.expire(key, TTL.MESSAGES);
    } catch (error) {
      console.error("Redis cacheChallengeMessage error:", error);
    }
  },

  /**
   * Get recent challenge messages
   */
  async getRecentChallengeMessages(challengeId, limit = 50) {
    try {
      if (!redisEnabled) return [];

      const key = KEYS.CHALLENGE_MESSAGES(challengeId);
      const messages = await redisAdapter.lrange(key, 0, limit - 1);
      return messages;
    } catch (error) {
      console.error("Redis getRecentChallengeMessages error:", error);
      return [];
    }
  },

  // ==================== LEGACY SUPPORT ====================

  /**
   * Update group member count (legacy method)
   * @deprecated Use cacheGroup() instead with full group data
   */
  async updateGroupMemberCount(groupId, count) {
    try {
      if (!redisEnabled) return;
      await redisAdapter.hset(KEYS.GROUP(groupId), { memberCount: count });
      await redisAdapter.expire(KEYS.GROUP(groupId), TTL.GROUP);
    } catch (error) {
      console.error("Redis updateGroupMemberCount error:", error);
    }
  },

  /**
   * Get cached group member count (legacy method)
   * @deprecated Use getGroup() instead for full group data
   */
  async getGroupMemberCount(groupId) {
    try {
      if (!redisEnabled) return null;
      const count = await redisAdapter.hget(KEYS.GROUP(groupId), "memberCount");
      return count ? parseInt(count) : null;
    } catch (error) {
      console.error("Redis getGroupMemberCount error:", error);
      return null;
    }
  },
};

export default redisClient;
