import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma as db } from "@/app/lib/db";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const skip = (page - 1) * limit;

    const submissions = await db.submission.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        language: true,
        submittedAt: true,
        problemId: true,
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
      take: limit,
      skip,
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("[SUBMISSIONS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
