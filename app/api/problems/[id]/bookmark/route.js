import { prisma } from '@/app/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const problemId = params.id;

  try {
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId,
        },
      },
    });

    if (existingBookmark) {
      // Bookmark exists, so delete it
      await prisma.bookmark.delete({
        where: {
          id: existingBookmark.id,
        },
      });
      return NextResponse.json({ success: true, bookmarked: false });
    } else {
      // Bookmark doesn't exist, so create it
      await prisma.bookmark.create({
        data: {
          userId,
          problemId,
        },
      });
      return NextResponse.json({ success: true, bookmarked: true });
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
} 