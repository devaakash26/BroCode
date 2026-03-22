import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/app/lib/db";
import { sendGroupInvitationEmail } from "@/app/lib/email";

// POST /api/groups/[id]/invite - Send group invitation to a user
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = params;
    const body = await req.json();
    const { userIds } = body; // Array of user IDs to invite

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds must be a non-empty array" },
        { status: 400 },
      );
    }

    // Check if sender is a member or admin of the group
    const userGroup = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            creatorId: true,
          },
        },
      },
    });

    if (!userGroup) {
      return NextResponse.json(
        { error: "Not a group member" },
        { status: 403 },
      );
    }

    // All group members can invite online users to the group

    // Check if users are already members
    const existingMembers = await prisma.userGroup.findMany({
      where: {
        groupId,
        userId: { in: userIds },
      },
      select: { userId: true },
    });
    const existingMemberIds = existingMembers.map((m) => m.userId);

    // Filter out existing members
    const newInviteeIds = userIds.filter(
      (id) => !existingMemberIds.includes(id),
    );

    if (newInviteeIds.length === 0) {
      return NextResponse.json(
        { error: "All selected users are already members of this group" },
        { status: 400 },
      );
    }

    // Check for existing pending invitations
    const existingInvitations = await prisma.notification.findMany({
      where: {
        userId: { in: newInviteeIds },
        type: "GROUP_INVITATION",
        read: false,
        metadata: {
          path: ["groupId"],
          equals: groupId,
        },
      },
      select: { userId: true },
    });
    const alreadyInvitedIds = existingInvitations.map((n) => n.userId);

    // Filter out users who already have pending invitations
    const finalInviteeIds = newInviteeIds.filter(
      (id) => !alreadyInvitedIds.includes(id),
    );

    if (finalInviteeIds.length === 0) {
      return NextResponse.json(
        { error: "All selected users already have pending invitations" },
        { status: 400 },
      );
    }

    // Create notifications for each user (using transaction for atomicity)
    const notifications = await prisma.$transaction(
      finalInviteeIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            senderId: session.user.id,
            type: "GROUP_INVITATION",
            title: "Group Invitation",
            message: `${session.user.name} invited you to join "${userGroup.group.name}"`,
            metadata: {
              groupId,
              groupName: userGroup.group.name,
              inviterId: session.user.id,
              inviterName: session.user.name,
            },
            actionUrl: `/groups/${groupId}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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
        }),
      ),
    );

    // Emit real-time notifications via Socket.IO
    if (req.io) {
      console.log("[group-invite] Emitting real-time notifications...");
      notifications.forEach((notification) => {
        req.io.emit("sendNotification", {
          recipientId: notification.userId,
          notification,
        });
      });
      console.log(
        `[group-invite] ✓ Emitted ${notifications.length} real-time notifications`,
      );
    } else {
      console.log(
        "[group-invite] ℹ️  Socket.IO not available in API route context",
      );
      console.log(
        "[group-invite] 📋 Notifications saved to DB - recipients will receive via polling (15s interval)",
      );
    }

    // Send email invitations (fire-and-forget, don't block response)
    (async () => {
      try {
        console.log("[group-invite] Sending email invitations...");
        
        // Fetch user emails for invited users
        const invitedUsers = await prisma.user.findMany({
          where: {
            id: { in: finalInviteeIds },
          },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });

        // Get group details including description
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          select: {
            description: true,
          },
        });

        // Send emails in parallel
        const emailPromises = invitedUsers.map((user) => {
          if (!user.email) {
            console.log(`[group-invite] ⚠️  Skipping email for user ${user.id} (no email)`);
            return Promise.resolve({ success: false, reason: 'no email' });
          }

          const joinLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/groups/${groupId}`;
          
          return sendGroupInvitationEmail({
            to: user.email,
            inviterName: session.user.name || 'A BroCode member',
            groupName: userGroup.group.name,
            groupDescription: group?.description || undefined,
            joinLink,
          }).catch((error) => {
            console.error(`[group-invite] Failed to send email to ${user.email}:`, error);
            return { success: false, error };
          });
        });

        const emailResults = await Promise.all(emailPromises);
        const successCount = emailResults.filter(r => r.success).length;
        console.log(
          `[group-invite] ✓ Sent ${successCount}/${invitedUsers.length} invitation emails`,
        );
      } catch (error) {
        console.error("[group-invite] Error sending invitation emails:", error);
        // Don't throw - this is fire-and-forget
      }
    })();

    return NextResponse.json({
      success: true,
      invitationsSent: notifications.length,
      notifications,
      alreadyMembers: existingMemberIds.length,
      alreadyInvited: alreadyInvitedIds.length,
    });
  } catch (error) {
    console.error("[group-invite] POST error:", error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 },
    );
  }
}
