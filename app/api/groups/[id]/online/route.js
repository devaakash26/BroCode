import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/db';
import { PrismaClient } from '@prisma/client';
import redisClient, { redisHelpers } from '@/lib/redis';

const prismaClient = new PrismaClient();

// GET /api/groups/[id]/online - Get online members count and IDs
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
    const membership = await prismaClient.userGroup.findUnique({
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

    // Get online users from Redis
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const key = `online_users:${groupId}`;
    
    let userIds = [];
    let onlineUsers = [];
    
    try {
      if (redisClient) {
        userIds = await redisClient.zrangebyscore(key, fiveMinutesAgo, '+inf');
        // Get actual online users data
        onlineUsers = await redisHelpers.getOnlineUsers(groupId);
      }
    } catch (error) {
      console.error('Redis error:', error);
      // Continue with fallback data
    }
    
    // Get current member count from database (for comparison/debugging)
    const { _count } = await prismaClient.userGroup.aggregate({
      where: {
        groupId,
      },
      _count: true,
    });

    // Update user's last active timestamp in the group
    await prismaClient.userGroup.update({
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

    // Also update in Redis
    try {
      await redisHelpers.addOnlineUser(groupId, session.user.id, {
        name: session.user.name,
      });

      // Update group member count in Redis cache if needed
      const cachedCount = await redisHelpers.getGroupMemberCount(groupId);
      if (cachedCount !== _count) {
        await redisHelpers.updateGroupMemberCount(groupId, _count);
      }
    } catch (error) {
      console.error('Redis update error:', error);
      // Continue as Redis is optional
    }

    return NextResponse.json({
      onlineCount: userIds.length || 1, // Default to at least 1 (current user)
      totalCount: _count,
      onlineUsers: onlineUsers.length ? onlineUsers : [{ 
        userId: session.user.id, 
        name: session.user.name,
        lastActive: Date.now()
      }],
    });
  } catch (error) {
    console.error('Error getting online users:', error);
    return NextResponse.json(
      { error: 'Failed to get online users' },
      { status: 500 }
    );
  }
} 