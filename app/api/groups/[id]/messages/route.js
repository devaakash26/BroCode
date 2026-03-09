import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/db";
import redisClient, { redisHelpers } from "@/lib/redis";

// GET /api/groups/[id]/messages - Get messages for a group
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = params;
    const url = new URL(request.url);
    const before = url.searchParams.get("before"); // cursor-based pagination
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)),
    );

    // Check membership and fetch messages in parallel
    const [membership, dbMessages] = await prisma.$transaction([
      prisma.userGroup.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId,
          },
        },
        select: { userId: true },
      }),
      prisma.chatMessage.findMany({
        where: {
          groupId,
          challengeId: null,
          ...(before ? { sentAt: { lt: new Date(before) } } : {}),
        },
        orderBy: {
          sentAt: "desc",
        },
        take: limit,
        select: {
          id: true,
          content: true,
          senderId: true,
          groupId: true,
          replyToId: true,
          sentAt: true,
          isSystem: true,
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 },
      );
    }

    // Transform and reverse for chronological order
    const messages = dbMessages
      .map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.sender.name,
        senderImage: msg.sender.image,
        groupId: msg.groupId,
        replyToId: msg.replyToId,
        sentAt: msg.sentAt.toISOString(),
        isSystem: msg.isSystem,
      }))
      .reverse();

    // Update lastActive in the background — don't block the response
    prisma.userGroup
      .update({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId,
          },
        },
        data: { lastActive: new Date() },
      })
      .catch(() => {});

    const response = NextResponse.json({
      messages,
      hasMore: dbMessages.length === limit,
    });
    response.headers.set("Cache-Control", "private, max-age=5");
    return response;
  } catch (error) {
    console.error("Error fetching group messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

// POST /api/groups/[id]/messages - Create a new message
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = params;
    const { content, replyToId } = await request.json();

    // Check if user is a member of the group
    const membership = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 },
      );
    }

    // Create message in database — use select instead of include
    const message = await prisma.chatMessage.create({
      data: {
        content,
        senderId: session.user.id,
        groupId,
        replyToId: replyToId || null,
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        groupId: true,
        replyToId: true,
        sentAt: true,
        isSystem: true,
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Format message for response
    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderImage: message.sender.image,
      groupId: message.groupId,
      replyToId: message.replyToId,
      sentAt: message.sentAt.toISOString(),
      isSystem: message.isSystem,
    };

    // Update lastActive in the background — don't block the response
    prisma.userGroup
      .update({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId,
          },
        },
        data: { lastActive: new Date() },
      })
      .catch(() => {});

    return NextResponse.json({ message: formattedMessage });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
