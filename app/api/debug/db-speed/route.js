import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

// Helper to measure query time
async function measureQuery(name, queryFn, runs = 3) {
  const times = [];
  
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    try {
      await queryFn();
      const duration = performance.now() - start;
      times.push(duration);
    } catch (error) {
      return {
        name,
        error: error.message,
        status: "❌ FAILED"
      };
    }
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return {
    name,
    avgMs: Math.round(avg),
    minMs: Math.round(min),
    maxMs: Math.round(max),
    runs,
    status: avg < 100 ? "✅ EXCELLENT" : avg < 300 ? "✔️ GOOD" : avg < 500 ? "⚠️ SLOW" : "❌ CRITICAL"
  };
}

// Get performance rating and recommendations
function getPerformanceAnalysis(results) {
  const avgLatency = results
    .filter(r => !r.error && r.avgMs)
    .reduce((sum, r) => sum + r.avgMs, 0) / results.length;
  
  let rating, recommendations = [];
  
  if (avgLatency < 100) {
    rating = "✅ EXCELLENT";
    recommendations.push("Database performance is optimal");
  } else if (avgLatency < 300) {
    rating = "✔️ GOOD";
    recommendations.push("Performance is acceptable for production");
    recommendations.push("Consider connection pooling optimization");
  } else if (avgLatency < 500) {
    rating = "⚠️ SLOW";
    recommendations.push("High latency detected - investigate network/region");
    recommendations.push("Enable connection pooling if not already active");
    recommendations.push("Consider database region closer to your server");
    recommendations.push("Check for missing indexes on frequently queried fields");
  } else {
    rating = "❌ CRITICAL";
    recommendations.push("URGENT: Critical latency issues detected!");
    recommendations.push("Database region may be too far from application server");
    recommendations.push("Check database connection pooler settings");
    recommendations.push("Verify database server health and resources");
    recommendations.push("Consider using read replicas in server region");
  }
  
  return { rating, avgLatency: Math.round(avgLatency), recommendations };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const runs = parseInt(searchParams.get('runs') || '3', 10);
  const detailed = searchParams.get('detailed') === 'true';
  
  const startTime = Date.now();
  const results = [];

  try {
    // Test 1: Raw connection test (minimal query)
    results.push(await measureQuery(
      "1. Raw Connection (SELECT 1)",
      async () => await prisma.$queryRaw`SELECT 1`,
      runs
    ));

    // Test 2: Simple primary key lookup
    results.push(await measureQuery(
      "2. Simple PK Lookup",
      async () => await prisma.user.findFirst({
        select: { id: true },
        take: 1
      }),
      runs
    ));

    // Test 3: Indexed field query
    results.push(await measureQuery(
      "3. Indexed Field Query",
      async () => await prisma.user.findFirst({
        where: { email: { contains: "@" } },
        select: { id: true, email: true }
      }),
      runs
    ));

    // Test 4: Count operation
    results.push(await measureQuery(
      "4. Count Operation",
      async () => await prisma.user.count(),
      runs
    ));

    // Test 5: Join query (1 level)
    results.push(await measureQuery(
      "5. Single Join Query",
      async () => await prisma.group.findFirst({
        select: {
          id: true,
          name: true,
          members: {
            take: 5,
            select: { userId: true }
          }
        }
      }),
      runs
    ));

    if (detailed) {
      // Test 6: Aggregation
      results.push(await measureQuery(
        "6. Aggregation Query",
        async () => await prisma.submission.groupBy({
          by: ['userId'],
          _count: { id: true }
        }).then(results => results.slice(0, 10)),
        runs
      ));

      // Test 7: Complex join (multi-level)
      results.push(await measureQuery(
        "7. Multi-level Join",
        async () => await prisma.user.findFirst({
          select: {
            id: true,
            userGroups: {
              take: 3,
              select: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    members: {
                      take: 3,
                      select: { userId: true }
                    }
                  }
                }
              }
            }
          }
        }),
        runs
      ));
    }

    // Write test (if requested)
    if (detailed) {
      const writeStart = performance.now();
      try {
        await prisma.$queryRaw`SELECT NOW()`;
        const writeDuration = performance.now() - writeStart;
        results.push({
          name: "8. Write Test (NOW query)",
          avgMs: Math.round(writeDuration),
          minMs: Math.round(writeDuration),
          maxMs: Math.round(writeDuration),
          runs: 1,
          status: writeDuration < 100 ? "✅ EXCELLENT" : writeDuration < 300 ? "✔️ GOOD" : "⚠️ SLOW"
        });
      } catch (error) {
        results.push({
          name: "8. Write Test",
          error: error.message,
          status: "❌ FAILED"
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const analysis = getPerformanceAnalysis(results);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      serverRegion: process.env.VERCEL_REGION || process.env.RAILWAY_REGION || "unknown",
      dbRegion: "Southeast Asia (Singapore) - ap-southeast-1",
      totalTestTime: `${totalTime}ms`,
      
      performance: {
        rating: analysis.rating,
        avgLatency: `${analysis.avgLatency}ms`,
      },
      
      tests: results,
      
      recommendations: analysis.recommendations,
      
      tips: [
        "Lower is better - aim for <100ms avg latency",
        "Geographic distance affects latency significantly",
        "Connection pooling can reduce connection overhead",
        "Add ?detailed=true for more comprehensive tests",
        "Add ?runs=5 to run each test 5 times (default: 3)"
      ],
      
      connectionInfo: {
        databaseUrl: process.env.DATABASE_URL ? "✅ Set" : "❌ Not set",
        directUrl: process.env.DIRECT_URL ? "✅ Set" : "❌ Not set",
        pooling: process.env.DATABASE_URL?.includes('pooler') ? "✅ Enabled" : "⚠️ Not detected"
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: "❌ Database test FAILED",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        tests: results,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
