import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/db';
import redisClient, { redisHelpers } from '@/lib/redis';

// GET /api/groups/[id]/messages - Get messages for a group
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = params;

    // Check if user is a member of the group
    const membership = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this group' },
        { status: 403 }
      );
    }

    // Try to get cached messages from Redis first
    let messages = [];
    try {
      if (redisClient) {
        messages = await redisHelpers.getRecentMessages(groupId);
      }
    } catch (error) {
      console.error('Redis get messages error:', error);
      // Continue to fetch from database
    }

    // If no cached messages, fetch from database
    if (!messages || messages.length === 0) {
      const dbMessages = await prisma.chatMessage.findMany({
        where: {
          groupId,
          challengeId: null, // Only get general group messages, not challenge-specific
        },
        orderBy: {
          sentAt: 'desc',
        },
        take: 50,
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

      // Transform and reverse messages for chronological order
      messages = dbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.sender.name,
        senderImage: msg.sender.image,
        groupId: msg.groupId,
        replyToId: msg.replyToId,
        sentAt: msg.sentAt.toISOString(),
        isSystem: msg.isSystem,
      })).reverse();

      // Cache messages in Redis
      try {
        if (redisClient) {
          for (const message of messages) {
            await redisHelpers.cacheMessage(groupId, message);
          }
        }
      } catch (error) {
        console.error('Redis cache messages error:', error);
        // Continue as Redis caching is optional
      }
    }

    // Update user's last active timestamp in group
    await prisma.userGroup.update({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
      data: {
        lastActive: new Date(),
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/messages - Create a new message
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = params;
    const { content, replyToId } = await request.json();

    // Check if user is a member of the group
    const membership = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this group' },
        { status: 403 }
      );
    }

    // Create message in database
    const message = await prisma.chatMessage.create({
      data: {
        content,
        senderId: session.user.id,
        groupId,
        replyToId: replyToId || null,
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

    // Format message for response
    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderImage: message.sender.image,
      groupId: message.groupId,
      replyToId: message.replyToId,
      sentAt: message.sentAt.toISOString(),
      isSystem: message.isSystem,
    };

    // Cache message in Redis
    try {
      if (redisClient) {
        await redisHelpers.cacheMessage(groupId, formattedMessage);
      }
    } catch (error) {
      console.error('Redis cache message error:', error);
      // Continue as Redis is optional
    }

    // If there's a Socket.IO server instance available, broadcast the message
    try {
      const socketIO = request.socket?.server?.io;
      if (socketIO) {
        socketIO.to(`group:${groupId}`).emit('newMessage', formattedMessage);
      }
    } catch (error) {
      console.error('Socket.io broadcast error:', error);
      // Continue as real-time updates are optional
    }

    // Update user's last active timestamp
    await prisma.userGroup.update({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
      data: {
        lastActive: new Date(),
      },
    });

    return NextResponse.json({ message: formattedMessage });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 