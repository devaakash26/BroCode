import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const queries = await prisma.helpQuery.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(queries, { status: 200 });
  } catch (error) {
    console.error("Error fetching user queries:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
} 