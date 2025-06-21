import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import { sendEmail } from '@/app/lib/email';

async function notifyAdmin(group, newUser) {
  try {
    const groupWithAdmin = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          where: { role: 'ADMIN' },
          include: {
            user: true,
          },
        },
      },
    });

    if (groupWithAdmin && groupWithAdmin.members.length > 0) {
      const admin = groupWithAdmin.members[0].user;
      if (admin.email && admin.id !== newUser.id) {
        await sendEmail({
          to: admin.email,
          subject: `New member in your group "${groupWithAdmin.name}"`,
          html: `
            <p>Hi ${groupWithAdmin.admin.name || 'Admin'},</p>
            <p>A new member, ${newUser.name}, has joined your group "${groupWithAdmin.name}".</p>
            <p>You are receiving this email because you are the admin of the "${groupWithAdmin.name}" group on BroCode.</p>
          `,
        });
      }
    }
  } catch (emailError) {
    console.error('Failed to send new member notification email:', emailError);
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to get invite code from body
    const requestData = await request.json().catch(() => ({}));
    let inviteCode = requestData.inviteCode;
    
    // If not in body, try to get from URL query parameters
    if (!inviteCode) {
      const url = new URL(request.url);
      inviteCode = url.searchParams.get('code');
    }

    if (!inviteCode) {
      return NextResponse.json(
        { message: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Find the group with the given invite code
    const group = await prisma.group.findFirst({
      where: {
        inviteCode,
        isActive: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Invalid invite code or group not found' },
        { status: 404 }
      );
    }

    // Check if the user is already a member of the group
    const existingMembership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: group.id,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { message: 'You are already a member of this group', groupId: group.id },
        { status: 200 }
      );
    }

    // Add the user to the group
    await prisma.userGroup.create({
      data: {
        userId: session.user.id,
        groupId: group.id,
        role: 'MEMBER', // Default role is MEMBER
      },
    });

    // Notify admin
    await notifyAdmin(group, session.user);

    return NextResponse.json({
      message: 'Successfully joined the group',
      groupId: group.id,
    });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json(
      { message: 'Error joining group', error: error.message },
      { status: 500 }
    );
  }
}

// Also support GET requests for joining via links
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      // For GET requests, redirect to login instead of returning JSON error
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      return NextResponse.redirect(
        `/auth/signin?callbackUrl=${encodeURIComponent(`/groups/join?code=${code}`)}`
      );
    }

    // Get invite code from URL
    const url = new URL(request.url);
    const inviteCode = url.searchParams.get('code');

    if (!inviteCode) {
      return NextResponse.json(
        { message: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Find the group with the given invite code
    const group = await prisma.group.findFirst({
      where: {
        inviteCode,
        isActive: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Invalid invite code or group not found' },
        { status: 404 }
      );
    }

    // Check if the user is already a member of the group
    const existingMembership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: group.id,
      },
    });

    if (existingMembership) {
      // Redirect to the group page
      return NextResponse.redirect(`/groups/${group.id}`);
    }

    // Add the user to the group
    await prisma.userGroup.create({
      data: {
        userId: session.user.id,
        groupId: group.id,
        role: 'MEMBER', // Default role is MEMBER
      },
    });

    // Notify admin
    await notifyAdmin(group, session.user);

    // Redirect to the group page
    return NextResponse.redirect(`/groups/${group.id}`);
  } catch (error) {
    console.error('Error joining group via GET:', error);
    return NextResponse.json(
      { message: 'Error joining group', error: error.message },
      { status: 500 }
    );
  }
} 
