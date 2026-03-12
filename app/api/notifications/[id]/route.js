import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/app/lib/db";

// PATCH /api/notifications/[id] - Mark single notification as read
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { read } = body;

    const notification = await prisma.notification.update({
      where: {
        id,
        userId: session.user.id, // Security: only update own notifications
      },
      data: {
        read: read !== undefined ? read : true,
      },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("[notification] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}

// DELETE /api/notifications/[id] - Delete single notification
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    await prisma.notification.delete({
      where: {
        id,
        userId: session.user.id, // Security: only delete own notifications
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notification] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 },
    );
  }
}
