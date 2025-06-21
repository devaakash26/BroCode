import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';




import { prisma } from '@/app/lib/db';

// Get messages for a challenge
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupId, challengeId } = params;
    
    // Check if user is a member of the group
    const userGroup = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId,
      },
    });
    
    if (!userGroup) {
      return NextResponse.json(
        { message: 'You are not a member of this group' },
        { status: 403 }
      );
    }
    
    // Get challenge to verify it exists and belongs to this group
    const challenge = await prisma.challenge.findUnique({
      where: {
        id: challengeId,
        groupId,
      },
    });
    
    if (!challenge) {
      return NextResponse.json(
        { message: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // Get messages for this challenge
    const messages = await prisma.chatMessage.findMany({
      where: {
        challengeId,
        groupId,
      },
      orderBy: {
        sentAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      take: 100, // Limit to last 100 messages
    });
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching challenge messages:', error);
    return NextResponse.json(
      { message: 'Error fetching messages', error: error.message },
      { status: 500 }
    );
  }
}

// Post a new message
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupId, challengeId } = params;
    const { content } = await request.json();
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { message: 'Message content is required' },
        { status: 400 }
      );
    }
    
    // Check if user is a member of the group
    const userGroup = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId,
      },
    });
    
    if (!userGroup) {
      return NextResponse.json(
        { message: 'You are not a member of this group' },
        { status: 403 }
      );
    }
    
    // Get challenge to verify it exists and belongs to this group
    const challenge = await prisma.challenge.findUnique({
      where: {
        id: challengeId,
        groupId,
      },
    });
    
    if (!challenge) {
      return NextResponse.json(
        { message: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // Create the message
    const message = await prisma.chatMessage.create({
      data: {
        content: content.trim(),
        senderId: session.user.id,
        groupId,
        challengeId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending challenge message:', error);
    return NextResponse.json(
      { message: 'Error sending message', error: error.message },
      { status: 500 }
    );
  }
} 