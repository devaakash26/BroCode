import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import { nanoid } from 'nanoid';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, description, isPublic = true } = await request.json();

    // Validate required fields
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { message: 'Group name must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Create a unique invite code
    const inviteCode = nanoid(8);
    
    // Create the full invite link using origin from the request
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const inviteLink = `${origin}/groups/join?code=${inviteCode}`;

    // Create the group
    const group = await prisma.group.create({
      data: {
        name,
        description: description || '',
        inviteCode,
        inviteLink,
        isActive: true,
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN', // The creator is automatically an admin
          },
        },
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { message: 'Error creating group', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const whereClause = {
      isActive: true,
      name: {
        contains: query,
        mode: 'insensitive',
      },
      OR: [
        {
          visibility: 'PUBLIC',
        },
        {
          visibility: {
            in: ['PRIVATE', 'UNLISTED'],
          },
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    };

    // Get groups that match the search query and visibility rules
    const groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            members: true,
            challenges: true,
          },
        },
      },
      take: limit,
      skip,
      orderBy: {
        members: {
          _count: 'desc',
        },
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.group.count({
      where: whereClause,
    });

    return NextResponse.json({
      groups,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { message: 'Error fetching groups', error: error.message },
      { status: 500 }
    );
  }
} 
