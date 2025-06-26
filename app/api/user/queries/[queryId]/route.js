import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const { queryId } = params;

    const query = await prisma.helpQuery.findUnique({
      where: { id: queryId },
      include: {
        user: {
          select: { name: true, email: true, image: true },
        },
        replies: {
          include: {
            user: {
              select: { name: true, email: true, image: true, role: true },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!query || query.userId !== session.user.id) {
      return NextResponse.json({ message: "Query not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json(query, { status: 200 });
  } catch (error) {
    console.error("Error fetching query:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
} 