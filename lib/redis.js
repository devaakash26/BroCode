import { Redis } from "@upstash/redis";

// Initialize Upstash Redis REST client
let redisClient = null;
let redisEnabled = false;
let redisInitPromise = null;

try {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (restUrl && restToken) {
    // Create Redis client - Upstash handles JSON serialization automatically
    // The previous error "TypeError: Cannot convert undefined or null to object"
    // is a known issue with auto pipeline in older versions of @upstash/redis when
    // interacting with some Next.js environments
    redisClient = new Redis({
      url: restUrl,
      token: restToken,
      enableAutoPipelining: false, // Turn off auto pipelining to avoid empty pipeline errors
    });

    // Initialize connection and set redisEnabled synchronously after first successful operation
    redisInitPromise = redisClient
      .ping()
      .then(() => {
        console.log("✅ Connected to Upstash Redis");
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
    console.log("No Upstash Redis credentials — using in-memory fallback");
  }
} catch (error) {
  console.error("Failed to initialize Redis:", error);
  redisEnabled = false;
  console.log("Using in-memory fallback for storage");
}

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
    const result = await redisClient.ping();
    return result === "PONG";
  } catch (error) {
    console.error("Redis check status error:", error);
    return false;
  }
};

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

      // Check if data is already an object returned by Upstash
      let data = await redisClient.get(key);
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

      // Ensure value is JSON-serializable (convert Dates, etc.)
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

      // Upstash automatically handles JSON serialization
      const setResult = await redisClient.set(key, cleanValue, {
        ex: ttl,
      });
      console.log(`[Redis] Set result:`, setResult);

      // Verify the key was set
      const verification = await redisClient.exists(key);
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
        await redisClient.del(...keys);
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

      // Upstash Redis doesn't support SCAN, so we use a prefix list approach
      // For now, just document that individual keys should be deleted
      console.warn(
        `Pattern deletion not fully supported on Upstash. Use explicit del() calls.`,
      );
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

      // Use pipeline for atomic operations
      await redisClient.zadd(key, { score: timestamp, member: userId });
      await redisClient.hset(userPresenceKey, {
        ...userData,
        lastActive: timestamp,
        groupId,
      });
      await redisClient.expire(userPresenceKey, TTL.ONLINE_USERS);
      await redisClient.expire(key, TTL.ONLINE_USERS);

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

      const userIds = await redisClient.zrange(key, fiveMinutesAgo, "+inf", {
        byScore: true,
      });

      if (!userIds || userIds.length === 0) return [];

      const users = [];
      for (const userId of userIds) {
        const userData = await redisClient.hgetall(KEYS.USER_PRESENCE(userId));
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
      await redisClient.zrem(key, userId);
      await redisClient.del(KEYS.USER_PRESENCE(userId));
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
      await redisClient.lpush(key, JSON.stringify(message));
      await redisClient.ltrim(key, 0, 99); // Keep only last 100
      await redisClient.expire(key, TTL.MESSAGES);
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
      const messages = await redisClient.lrange(key, 0, limit - 1);
      return messages.map((msg) =>
        typeof msg === "string" ? JSON.parse(msg) : msg,
      );
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
      await redisClient.lpush(key, JSON.stringify(message));
      await redisClient.ltrim(key, 0, 49); // Keep only last 50
      await redisClient.expire(key, TTL.MESSAGES);
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
      const messages = await redisClient.lrange(key, 0, limit - 1);
      return messages.map((msg) =>
        typeof msg === "string" ? JSON.parse(msg) : msg,
      );
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
      await redisClient.hset(KEYS.GROUP(groupId), { memberCount: count });
      await redisClient.expire(KEYS.GROUP(groupId), TTL.GROUP);
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
      const count = await redisClient.hget(KEYS.GROUP(groupId), "memberCount");
      return count ? parseInt(count) : null;
    } catch (error) {
      console.error("Redis getGroupMemberCount error:", error);
      return null;
    }
  },
};

export default redisClient;
