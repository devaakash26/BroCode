import { Redis } from "@upstash/redis";

// Initialize Upstash Redis REST client
let redisClient = null;
let redisEnabled = false;

try {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (restUrl && restToken) {
    redisClient = new Redis({ url: restUrl, token: restToken });
    // Test connectivity
    redisClient
      .ping()
      .then(() => {
        console.log("Connected to Upstash Redis");
        redisEnabled = true;
      })
      .catch((err) => {
        console.warn("Failed to connect to Upstash Redis:", err.message);
        console.log("Using in-memory fallback for storage");
        redisEnabled = false;
      });
  } else {
    console.log("No Upstash Redis credentials — using in-memory fallback");
  }
} catch (error) {
  console.error("Failed to initialize Redis:", error);
  redisEnabled = false;
  console.log("Using in-memory fallback for storage");
}

// Add a function to check Redis status
export const checkRedisStatus = async () => {
  if (!redisClient) return false;
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
  onlineUsers: new Map(), // groupId -> Map(userId -> userData)
  messages: new Map(), // groupId -> array of messages
  groups: new Map(), // groupId -> group data
};

// Key prefixes for different data types
const KEYS = {
  ONLINE_USERS: "online_users:",
  GROUP_MEMBERS: "group_members:",
  RECENT_MESSAGES: "recent_messages:",
  USER_PRESENCE: "user_presence:",
};

// Helper functions for working with Redis
export const redisHelpers = {
  // Track online users in a group
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

      const key = `${KEYS.ONLINE_USERS}${groupId}`;
      const userKey = `${KEYS.USER_PRESENCE}${userId}`;
      const timestamp = Date.now();

      await redisClient.zadd(key, { score: timestamp, member: userId });
      await redisClient.hset(userKey, {
        ...userData,
        lastActive: timestamp,
        groupId,
      });
      await redisClient.expire(userKey, 300);

      return await this.getOnlineUsers(groupId);
    } catch (error) {
      console.error("Redis addOnlineUser error:", error);
      return [];
    }
  },

  // Get online users in a group
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

      const key = `${KEYS.ONLINE_USERS}${groupId}`;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const userIds = await redisClient.zrange(key, fiveMinutesAgo, "+inf", {
        byScore: true,
      });

      const users = [];
      for (const userId of userIds) {
        const userData = await redisClient.hgetall(
          `${KEYS.USER_PRESENCE}${userId}`,
        );
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

  // Remove user from online list
  async removeOnlineUser(groupId, userId) {
    try {
      if (!redisEnabled) {
        const groupUsers = inMemoryStore.onlineUsers.get(groupId);
        if (groupUsers) {
          groupUsers.delete(userId);
        }
        return;
      }

      const key = `${KEYS.ONLINE_USERS}${groupId}`;
      await redisClient.zrem(key, userId);
      await redisClient.del(`${KEYS.USER_PRESENCE}${userId}`);
    } catch (error) {
      console.error("Redis removeOnlineUser error:", error);
    }
  },

  // Cache recent messages for a group
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

      const key = `${KEYS.RECENT_MESSAGES}${groupId}`;
      await redisClient.lpush(key, JSON.stringify(message));
      await redisClient.ltrim(key, 0, 99);
    } catch (error) {
      console.error("Redis cacheMessage error:", error);
    }
  },

  // Get recent messages for a group
  async getRecentMessages(groupId, limit = 50) {
    try {
      if (!redisEnabled) {
        const messages = inMemoryStore.messages.get(groupId) || [];
        return messages.slice(0, limit);
      }

      const key = `${KEYS.RECENT_MESSAGES}${groupId}`;
      const messages = await redisClient.lrange(key, 0, limit - 1);
      return messages.map((msg) =>
        typeof msg === "string" ? JSON.parse(msg) : msg,
      );
    } catch (error) {
      console.error("Redis getRecentMessages error:", error);
      return [];
    }
  },

  // Update group member count in cache
  async updateGroupMemberCount(groupId, count) {
    try {
      if (!redisEnabled) {
        inMemoryStore.groups.set(groupId, {
          ...(inMemoryStore.groups.get(groupId) || {}),
          memberCount: count,
        });
        return;
      }

      await redisClient.hset(`group:${groupId}`, { memberCount: count });
    } catch (error) {
      console.error("Redis updateGroupMemberCount error:", error);
    }
  },

  // Get cached group member count
  async getGroupMemberCount(groupId) {
    try {
      if (!redisEnabled) {
        return inMemoryStore.groups.get(groupId)?.memberCount || null;
      }

      const count = await redisClient.hget(`group:${groupId}`, "memberCount");
      return count ? parseInt(count) : null;
    } catch (error) {
      console.error("Redis getGroupMemberCount error:", error);
      return null;
    }
  },
};

export default redisClient;
