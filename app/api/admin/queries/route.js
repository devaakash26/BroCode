import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const queries = await prisma.helpQuery.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(queries, { status: 200 });
  } catch (error) {
    console.error("Error fetching queries:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
} 