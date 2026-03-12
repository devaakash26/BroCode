import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/app/lib/db";
import { redisHelpers } from "@/lib/redis";

// POST /api/notifications/[id]/accept - Accept group invitation
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: notificationId } = params;

    // Fetch notification
    const notification = await prisma.notification.findUnique({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }

    if (notification.type !== "GROUP_INVITATION") {
      return NextResponse.json(
        { error: "This notification is not a group invitation" },
        { status: 400 },
      );
    }

    const { groupId } = notification.metadata;

    if (!groupId) {
      return NextResponse.json(
        { error: "Invalid invitation data" },
        { status: 400 },
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (existingMember) {
      // Mark notification as read and return success
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
      return NextResponse.json({
        success: true,
        message: "You are already a member of this group",
        alreadyMember: true,
      });
    }

    // Check if group exists and has space
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        memberLimit: true,
        currentMembers: true,
        isActive: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!group.isActive) {
      return NextResponse.json(
        { error: "This group is no longer active" },
        { status: 400 },
      );
    }

    if (group.memberLimit && group.currentMembers >= group.memberLimit) {
      return NextResponse.json({ error: "Group is full" }, { status: 400 });
    }

    // Add user to group and mark notification as read (transaction)
    await prisma.$transaction([
      prisma.userGroup.create({
        data: {
          userId: session.user.id,
          groupId,
          role: "MEMBER",
        },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: {
          currentMembers: { increment: 1 },
        },
      }),
      prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      }),
      // Send notification to inviter
      prisma.notification.create({
        data: {
          userId: notification.senderId,
          senderId: session.user.id,
          type: "SYSTEM_ANNOUNCEMENT",
          title: "Invitation Accepted",
          message: `${session.user.name} accepted your invitation to join "${group.name}"`,
          metadata: {
            groupId,
            groupName: group.name,
            acceptedBy: session.user.id,
          },
          actionUrl: `/groups/${groupId}`,
        },
      }),
    ]);

    // Invalidate cache for this group and groups lists
    try {
      console.log(
        `[accept-invitation] Invalidating cache for group ${groupId}`,
      );
      await Promise.all([
        redisHelpers.invalidateGroup(groupId),
        redisHelpers.invalidateAllGroupsLists(),
      ]);
      console.log(`[accept-invitation] ✓ Cache invalidated successfully`);
    } catch (cacheError) {
      console.error(
        "[accept-invitation] Cache invalidation error:",
        cacheError,
      );
      // Don't fail the request if cache invalidation fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully joined "${group.name}"`,
      groupId,
    });
  } catch (error) {
    console.error("[accept-invitation] POST error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 },
    );
  }
}
