#!/usr/bin/env node

/**
 * Test script to verify Redis cache is working
 * Run with: node scripts/test-redis-cache.js
 */

require("dotenv").config();

async function testRedisCache() {
  console.log("\n🧪 Testing Redis Cache...\n");

  // Import after dotenv loads
  const { redisHelpers, checkRedisStatus } = require("../lib/redis.js");

  try {
    // 1. Check Redis status
    console.log("1️⃣ Checking Redis connection...");
    const isConnected = await checkRedisStatus();
    console.log(`   Redis connected: ${isConnected ? "✅ YES" : "❌ NO"}\n`);

    if (!isConnected) {
      console.log("⚠️  Redis not connected. Check your environment variables:");
      console.log(
        "   REDIS_PROVIDER:",
        process.env.REDIS_PROVIDER || "(not set)",
      );
      console.log(
        "   RAILWAY_REDIS_URL:",
        process.env.RAILWAY_REDIS_URL ? "✅ set" : "❌ not set",
      );
      console.log(
        "   UPSTASH_REDIS_REST_URL:",
        process.env.UPSTASH_REDIS_REST_URL ? "✅ set" : "❌ not set",
      );
      process.exit(1);
    }

    // 2. Test basic cache operations
    console.log("2️⃣ Testing cache.set()...");
    const testKey = "brocode-test-key";
    const testData = { message: "Hello from test!", timestamp: Date.now() };
    await redisHelpers.cache.set(testKey, testData, 60);
    console.log(`   ✅ Set test key: ${testKey}\n`);

    // 3. Test cache retrieval
    console.log("3️⃣ Testing cache.get()...");
    const retrieved = await redisHelpers.cache.get(testKey);
    console.log(`   Retrieved:`, retrieved);

    if (retrieved && retrieved.message === testData.message) {
      console.log("   ✅ Cache GET successful!\n");
    } else {
      console.log("   ❌ Cache GET failed - data mismatch\n");
      process.exit(1);
    }

    // 4. Test user cache
    console.log("4️⃣ Testing user profile cache...");
    const testUserId = "test-user-123";
    const testProfile = {
      id: testUserId,
      name: "Test User",
      email: "test@brocode.io",
      problemsSolved: 42,
    };

    await redisHelpers.cacheUserProfile(testUserId, testProfile);
    console.log(`   ✅ Cached user profile for: ${testUserId}`);

    const cachedProfile = await redisHelpers.getUserProfile(testUserId);
    console.log(`   Retrieved profile:`, cachedProfile);

    if (cachedProfile && cachedProfile.email === testProfile.email) {
      console.log("   ✅ User profile cache successful!\n");
    } else {
      console.log("   ❌ User profile cache failed\n");
      process.exit(1);
    }

    // 5. Test leaderboard cache
    console.log("5️⃣ Testing leaderboard cache...");
    const leaderboardKey = "brocode-leaderboard-default";
    const leaderboardData = [
      { rank: 1, name: "User1", solvedCount: 100 },
      { rank: 2, name: "User2", solvedCount: 95 },
      { rank: 3, name: "User3", solvedCount: 90 },
    ];

    await redisHelpers.cache.set(leaderboardKey, leaderboardData, 300);
    console.log("   ✅ Cached leaderboard");

    const cachedLeaderboard = await redisHelpers.cache.get(leaderboardKey);
    console.log(`   Retrieved leaderboard:`, cachedLeaderboard);

    if (
      cachedLeaderboard &&
      Array.isArray(cachedLeaderboard) &&
      cachedLeaderboard.length === 3
    ) {
      console.log("   ✅ Leaderboard cache successful!\n");
    } else {
      console.log("   ❌ Leaderboard cache failed\n");
      process.exit(1);
    }

    // 6. Test dashboard cache
    console.log("6️⃣ Testing dashboard stats cache...");
    const dashboardKey = "brocode-dashboard-stats-test-user-123";
    const dashboardStats = {
      submissionCount: 150,
      groupCount: 3,
      problemsSolved: 42,
      upcomingChallenges: [],
      recentSubmissions: [],
    };

    await redisHelpers.cache.set(
      dashboardKey,
      { success: true, stats: dashboardStats },
      3600,
    );
    console.log("   ✅ Cached dashboard stats");

    const cachedDashboard = await redisHelpers.cache.get(dashboardKey);
    console.log(`   Retrieved dashboard:`, cachedDashboard);

    if (cachedDashboard && cachedDashboard.stats.problemsSolved === 42) {
      console.log("   ✅ Dashboard cache successful!\n");
    } else {
      console.log("   ❌ Dashboard cache failed\n");
      process.exit(1);
    }

    // 7. Clean up test keys
    console.log("7️⃣ Cleaning up test keys...");
    await redisHelpers.cache.del(testKey, dashboardKey, leaderboardKey);
    await redisHelpers.invalidateUserProfile(testUserId);
    console.log("   ✅ Test keys deleted\n");

    console.log("✅ All Redis cache tests passed!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Run the test
testRedisCache();
