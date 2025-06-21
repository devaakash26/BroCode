import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import { sendEmail } from '@/app/lib/email';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const groupId = params.id;

    // Find the group
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
        isActive: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if the user is already a member of the group
    const existingMembership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { message: 'You are already a member of this group', groupId },
        { status: 200 }
      );
    }

    // Add the user to the group
    await prisma.userGroup.create({
      data: {
        userId: session.user.id,
        groupId,
        role: 'MEMBER', // Default role is MEMBER
      },
    });

    // Send notification to group admin
    try {
      const groupWithAdmin = await prisma.group.findUnique({
        where: { id: groupId },
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
        const newUser = session.user;

        if (admin.email && admin.id !== newUser.id) { // Don't send email if admin joins their own group
          await sendEmail({
            to: admin.email,
            subject: `New Member Alert: ${newUser.name} joined ${groupWithAdmin.name}`,
            html: `
              <h1>A new member has joined your group!</h1>
              <p>
                <strong>${newUser.name}</strong> (<em>${newUser.email}</em>) has just joined your group: <strong>${groupWithAdmin.name}</strong>.
              </p>
              <p>
                You can view your group members and manage your group settings by visiting your dashboard.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/groups/${groupId}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">
                Go to Group
              </a>
              <p style="margin-top: 20px; font-size: 12px; color: #888;">
                You are receiving this email because you are the admin of the "${groupWithAdmin.name}" group on BroCode.
              </p>
            `,
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send new member notification email:', emailError);
      // Do not block the join process if email fails
    }

    return NextResponse.json({
      message: 'Successfully joined the group',
      groupId,
    });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json(
      { message: 'Error joining group', error: error.message },
      { status: 500 }
    );
  }
} 