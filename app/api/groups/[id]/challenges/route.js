import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { sendEmail } from "@/app/lib/email";
import { redisHelpers } from "@/lib/redis";

// Create a new challenge in a group
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log("Session data:", session);
    console.log("User data:", session.user);
    console.log("User ID:", session.user?.id);

    if (!session.user?.id) {
      return NextResponse.json(
        { message: "User ID not found in session" },
        { status: 401 },
      );
    }

    const groupId = params.id;

    // First, check if the user is the creator of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    const isCreator = group.creatorId === session.user.id;

    // If not the creator, check if the user is an admin of the group
    let hasPermission = isCreator;

    if (!hasPermission) {
      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: session.user.id,
          groupId,
          role: "ADMIN",
        },
      });

      hasPermission = !!userGroup;
    }

    if (!hasPermission) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to create challenges for this group",
        },
        { status: 403 },
      );
    }

    const {
      title,
      description,
      startTime,
      endTime,
      isPublic,
      problemIds,
      customProblems,
      isCustom,
      strictMode,
      inviteOnly,
      lateEntryMinutes,
      invitedMemberIds,
      sendInviteEmails,
    } = await request.json();

    // Validate input for the challenge itself
    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { message: "Missing required fields for challenge" },
        { status: 400 },
      );
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format" },
        { status: 400 },
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { message: "End time must be after start time" },
        { status: 400 },
      );
    }

    // Check if this is a custom challenge with user-created problems
    if (
      isCustom &&
      Array.isArray(customProblems) &&
      customProblems.length > 0
    ) {
      try {
        // Create the challenge first
        const challenge = await prisma.challenge.create({
          data: {
            title,
            description: description || "",
            startTime: start,
            endTime: end,
            visibleToParticipants: isPublic !== undefined ? isPublic : true,
            group: {
              connect: { id: groupId },
            },
            creator: {
              connect: { id: session.user.id },
            },
          },
        });

        // Create custom problems and associate them with the challenge
        for (const customProblem of customProblems) {
          // Create the problem
          const problem = await prisma.problem.create({
            data: {
              title: customProblem.title,
              description: customProblem.description,
              difficulty: customProblem.difficulty,
              exampleInput: customProblem.exampleInput || "",
              exampleOutput: customProblem.exampleOutput || "",
              constraints: customProblem.constraints || "",
              templateCode: customProblem.templateCode || {},
              testCases: customProblem.testCases || [],
              isCustom: true,
              group: {
                connect: { id: groupId },
              },
              creator: {
                connect: { id: session.user.id },
              },
            },
          });

          // Link the problem to the challenge
          await prisma.ChallengeProblems.create({
            data: {
              challengeId: challenge.id,
              problemId: problem.id,
            },
          });
        }

        // Auto-register creator as ACTIVE participant
        await prisma.challengeParticipant.upsert({
          where: {
            userId_challengeId: {
              userId: session.user.id,
              challengeId: challenge.id,
            },
          },
          create: {
            userId: session.user.id,
            challengeId: challenge.id,
            status: "ACTIVE",
          },
          update: {},
        });

        // Invalidate group cache so new challenge appears immediately
        await redisHelpers.invalidateGroup(groupId);

        return NextResponse.json({
          id: challenge.id,
          title: challenge.title,
          message: "Challenge with custom problems created successfully",
        });
      } catch (error) {
        console.error("Error creating custom challenge:", error);
        return NextResponse.json(
          { message: "Error creating custom challenge", error: error.message },
          { status: 500 },
        );
      }
    } else if (!Array.isArray(problemIds) || problemIds.length === 0) {
      // Not a custom challenge, but problem IDs are required
      return NextResponse.json(
        { message: "Problem IDs are required for standard challenges" },
        { status: 400 },
      );
    }

    // Standard challenge with existing problems
    try {
      // Create the challenge with existing problems
      const challenge = await prisma.challenge.create({
        data: {
          title,
          description: description || "",
          startTime: start,
          endTime: end,
          visibleToParticipants: isPublic !== undefined ? isPublic : true,
          strictMode: strictMode !== undefined ? strictMode : true,
          inviteOnly: inviteOnly || false,
          lateEntryMinutes:
            typeof lateEntryMinutes === "number"
              ? Math.max(0, Math.min(30, lateEntryMinutes))
              : 5,
          group: {
            connect: { id: groupId },
          },
          creator: {
            connect: { id: session.user.id },
          },
          problems: {
            create: problemIds.map((problemId) => ({
              problem: {
                connect: { id: problemId },
              },
            })),
          },
        },
      });

      // Auto-register creator as ACTIVE participant
      await prisma.challengeParticipant.upsert({
        where: {
          userId_challengeId: {
            userId: session.user.id,
            challengeId: challenge.id,
          },
        },
        create: {
          userId: session.user.id,
          challengeId: challenge.id,
          status: "ACTIVE",
        },
        update: {},
      });

      // Register invited members as participants
      if (
        inviteOnly &&
        Array.isArray(invitedMemberIds) &&
        invitedMemberIds.length > 0
      ) {
        await prisma.challengeParticipant.createMany({
          data: invitedMemberIds.map((userId) => ({
            userId,
            challengeId: challenge.id,
            status: "REGISTERED",
          })),
          skipDuplicates: true,
        });

        // Send invite emails in the background (fire-and-forget)
        if (sendInviteEmails) {
          const invitedUsers = await prisma.user.findMany({
            where: { id: { in: invitedMemberIds } },
            select: { email: true, name: true },
          });
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const challengeUrl = `${appUrl}/groups/${groupId}/challenges/${challenge.id}`;
          const startFormatted = start.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          });
          const endFormatted = end.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          });

          for (const u of invitedUsers) {
            sendEmail({
              to: u.email,
              subject: `You're invited: ${title} - BroCode Challenge`,
              html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f4f4f7}
.wrap{max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb}
.hdr{background:#4f46e5;padding:28px 24px;text-align:center;color:#fff}
.hdr h1{margin:0;font-size:20px;font-weight:700}
.body{padding:28px 24px}
.body p{margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6}
.pill{display:inline-block;background:#f0f0ff;color:#4f46e5;font-weight:600;padding:4px 10px;border-radius:6px;font-size:13px}
.btn{display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:8px 0 16px}
.ft{text-align:center;padding:16px;font-size:11px;color:#9ca3af}</style></head>
<body><div class="wrap"><div class="hdr"><h1>Challenge Invitation</h1></div>
<div class="body"><p>Hi ${u.name || "there"},</p>
<p>You've been invited to participate in <strong>${title}</strong>.</p>
<p><span class="pill">${startFormatted}</span> &rarr; <span class="pill">${endFormatted}</span></p>
<p>Make sure you're ready before the start time. You'll have ${typeof lateEntryMinutes === "number" ? lateEntryMinutes : 5} minutes after start to join.</p>
<p style="text-align:center"><a href="${challengeUrl}" class="btn">Open Challenge &rarr;</a></p>
<p style="font-size:12px;color:#6b7280">If the button doesn't work, copy this link: ${challengeUrl}</p>
</div><div class="ft">&copy; ${new Date().getFullYear()} BroCode</div></div></body></html>`,
            }).catch(() => {}); // fire-and-forget
          }
        }
      }

      // Invalidate group cache so new challenge appears immediately
      await redisHelpers.invalidateGroup(groupId);

      return NextResponse.json({
        id: challenge.id,
        title: challenge.title,
        message: "Challenge created successfully",
      });
    } catch (createError) {
      console.error("Failed to create challenge:", createError);
      return NextResponse.json(
        { message: "Error creating challenge", error: createError.message },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in challenge creation:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 },
    );
  }
}

// Get challenges for a group
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const groupId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;
    const status = searchParams.get("status"); // 'active', 'upcoming', 'past'

    // Check cache first (only for page 1 with no filters)
    const cacheKey = `challenges-${groupId}-${status || "all"}-${page}-${limit}`;
    if (page === 1 && limit <= 20 && !status) {
      try {
        const cached = await redisHelpers.cache.get(cacheKey);
        if (cached) {
          return NextResponse.json(cached);
        }
      } catch (e) {
        console.warn("[Challenges] Cache get error:", e.message);
      }
    }

    // Parallel authorization checks
    const [group, userGroup] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true },
      }),
      prisma.userGroup.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId,
          },
        },
        select: { role: true },
      }),
    ]);

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    const isCreator = group.creatorId === session.user.id;
    const isAdmin = isCreator || userGroup?.role === "ADMIN";

    if (!userGroup && !isCreator) {
      return NextResponse.json(
        { message: "You are not a member of this group" },
        { status: 403 },
      );
    }

    // Build the where clause
    const where = {
      groupId,
      ...(!isAdmin && { visibleToParticipants: true }),
    };

    // Filter by status
    const now = new Date();
    if (status === "active") {
      where.startTime = { lte: now };
      where.endTime = { gte: now };
    } else if (status === "upcoming") {
      where.startTime = { gt: now };
    } else if (status === "past") {
      where.endTime = { lt: now };
    }

    // Parallel fetch challenges and count
    const [challenges, totalCount] = await Promise.all([
      prisma.challenge.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          isActive: true,
          createdAt: true,
          maxScore: true,
          realTimeLeaderboard: true,
          visibleToParticipants: true,
          strictMode: true,
          inviteOnly: true,
          lateEntryMinutes: true,
          creator: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              problems: true,
              ChallengeParticipant: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
        take: limit,
        skip,
      }),
      prisma.challenge.count({ where }),
    ]);

    // Fetch user participation status separately (more efficient than nested query)
    const challengeIds = challenges.map((c) => c.id);
    const userParticipation =
      challengeIds.length > 0
        ? await prisma.challengeParticipant.findMany({
            where: {
              userId: session.user.id,
              challengeId: { in: challengeIds },
            },
            select: {
              challengeId: true,
              status: true,
              score: true,
              problemsSolved: true,
            },
          })
        : [];

    // Map participation to challenges
    const participationMap = new Map(
      userParticipation.map((p) => [p.challengeId, p]),
    );

    const responseData = {
      challenges: challenges.map((c) => ({
        ...c,
        participantCount: c._count.ChallengeParticipant,
        problemCount: c._count.problems,
        userParticipant: participationMap.get(c.id) || null,
        _count: undefined, // Remove _count from response
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    // Cache the result (30 second TTL)
    if (page === 1 && limit <= 20 && !status) {
      try {
        await redisHelpers.cache.set(cacheKey, responseData, 30);
      } catch (e) {
        console.warn("[Challenges] Cache set error:", e.message);
      }
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { message: "Error fetching challenges", error: error.message },
      { status: 500 },
    );
  }
}
