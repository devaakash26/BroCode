import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/db';

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;
  const problemId = params.id;

  if (!problemId) {
    return NextResponse.json({ message: 'Problem ID is required' }, { status: 400 });
  }

  try {
    // Check if the bookmark already exists
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId,
        },
      },
    });

    if (existingBookmark) {
      // If it exists, delete it
      await prisma.bookmark.delete({
        where: {
          id: existingBookmark.id,
        },
      });
      return NextResponse.json({ status: 'deleted' }, { status: 200 });
    } else {
      // If it does not exist, create it
      const newBookmark = await prisma.bookmark.create({
        data: {
          userId,
          problemId,
        },
      });
      return NextResponse.json({ status: 'created', bookmark: newBookmark }, { status: 201 });
    }
  } catch (error) {
    console.error('Bookmark toggle error:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
} 