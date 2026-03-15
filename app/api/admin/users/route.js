import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma, disconnectPrisma } from "@/app/lib/db";

// GET handler for fetching all users
export async function GET(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Fetch all users
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Format the response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      isVerified: !!user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 },
    );
  } finally {
    await disconnectPrisma();
  }
}

// DELETE handler for deleting a user
export async function DELETE(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    // Prevent deleting self
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    // Delete the user and all related data in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all group memberships
      await tx.userGroup.deleteMany({
        where: { userId },
      });

      // 2. Delete all submissions
      await tx.submission.deleteMany({
        where: { userId },
      });

      // 3. Delete all problems created by this user
      await tx.problem.deleteMany({
        where: { creatorId: userId },
      });

      // 4. Delete all groups created by this user
      await tx.group.deleteMany({
        where: { creatorId: userId },
      });

      // 5. Delete all challenges created by this user
      await tx.challenge.deleteMany({
        where: { creatorId: userId },
      });

      // 6. Delete challenge participations
      await tx.challengeParticipant.deleteMany({
        where: { userId },
      });

      // 7. Delete all help queries and replies
      await tx.queryReply.deleteMany({
        where: { userId },
      });

      await tx.helpQuery.deleteMany({
        where: { userId },
      });

      // 8. Delete all chat messages
      await tx.chatMessage.deleteMany({
        where: { senderId: userId },
      });

      // 9. Delete all bookmarks
      await tx.bookmark.deleteMany({
        where: { userId },
      });

      // 10. Delete all invitations sent by this user
      await tx.userInvitation.deleteMany({
        where: { senderId: userId },
      });

      // 11. Delete all notifications sent to or from this user
      await tx.notification.deleteMany({
        where: {
          OR: [
            { userId: userId }, // Notifications received by this user
            { senderId: userId }, // Notifications sent by this user
          ],
        },
      });

      // 12. Delete all accounts (OAuth providers)
      await tx.account.deleteMany({
        where: { userId },
      });

      // 13. Delete all sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      // 14. Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);

    // Provide more specific error messages
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to delete user due to existing dependencies. Please try again or contact support.",
        },
        { status: 500 },
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete user",
      },
      { status: 500 },
    );
  } finally {
    await disconnectPrisma();
  }
}

// PATCH handler for updating a user's role
export async function PATCH(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await request.json();
    const { userId, role } = data;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: "User ID and role are required" },
        { status: 400 },
      );
    }

    // Prevent changing own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot change your own role" },
        { status: 400 },
      );
    }

    // Valid roles
    const validRoles = ["USER", "GROUP_ADMIN", "PLATFORM_ADMIN"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 },
      );
    }

    // Update the user's role
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user role" },
      { status: 500 },
    );
  } finally {
    await disconnectPrisma();
  }
}
