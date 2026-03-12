import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/app/lib/db";

// POST /api/notifications/[id]/decline - Decline group invitation
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

    // Mark notification as read (declined)
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation declined",
    });
  } catch (error) {
    console.error("[decline-invitation] POST error:", error);
    return NextResponse.json(
      { error: "Failed to decline invitation" },
      { status: 500 },
    );
  }
}
