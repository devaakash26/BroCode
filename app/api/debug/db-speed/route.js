import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET() {
  const tests = [];

  try {
    // Test 1: Simple query
    const start1 = Date.now();
    await prisma.group.findFirst({
      select: { id: true },
    });
    tests.push({
      test: "Simple findFirst",
      time: Date.now() - start1,
      status: Date.now() - start1 < 100 ? "✅ GOOD" : "⚠️ SLOW",
    });

    // Test 2: With relation
    const start2 = Date.now();
    await prisma.group.findFirst({
      select: {
        id: true,
        members: {
          take: 5,
          select: { userId: true },
        },
      },
    });
    tests.push({
      test: "Query with relation",
      time: Date.now() - start2,
      status: Date.now() - start2 < 200 ? "✅ GOOD" : "⚠️ SLOW",
    });

    // Test 3: Count query
    const start3 = Date.now();
    await prisma.challenge.count();
    tests.push({
      test: "Count challenges",
      time: Date.now() - start3,
      status: Date.now() - start3 < 150 ? "✅ GOOD" : "⚠️ SLOW",
    });

    return NextResponse.json({
      status: "Database connection active",
      tests,
      summary: tests.every((t) => t.time < 200)
        ? "✅ Database performance is GOOD"
        : "⚠️ Database connection is SLOW - check Supabase region/pooler",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "❌ Database connection FAILED",
        error: error.message,
        tests,
      },
      { status: 500 },
    );
  }
}
