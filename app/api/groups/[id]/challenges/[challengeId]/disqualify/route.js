import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId, challengeId } = params;
    const { userIdToDisqualify } = await request.json();

    if (!userIdToDisqualify) {
        return NextResponse.json({ message: 'User ID to disqualify is required.' }, { status: 400 });
    }

    await prisma.challengeParticipant.update({
      where: {
        userId_challengeId: {
          userId: userIdToDisqualify,
          challengeId: challengeId,
        },
      },
      data: {
        disqualified: true,
      },
    });

    return NextResponse.json({ success: true, message: 'User has been disqualified.' });

  } catch (error) {
    console.error('Disqualification Error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred during disqualification.', error: error.message },
      { status: 500 }
    );
  }
} 