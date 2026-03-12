import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/app/lib/db";

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
