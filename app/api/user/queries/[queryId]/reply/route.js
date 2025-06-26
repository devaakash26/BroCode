import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/app/lib/email";

const adminNewReplyEmailTemplate = ({ userName, querySubject, userReply, queryLink }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>User Replied to a Query</title>
</head>
<body>
  <h2>User Reply Received</h2>
  <p><strong>${userName}</strong> has replied to the support query: "<strong>${querySubject}</strong>".</p>
  <h3>User's Message:</h3>
  <p>${userReply}</p>
  <a href="${queryLink}">View the full conversation</a>
</body>
</html>
`;


export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const { queryId } = params;
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ message: "Reply message is required" }, { status: 400 });
    }

    // Verify the user owns the query
    const query = await prisma.helpQuery.findFirst({
      where: { id: queryId, userId: session.user.id }
    });
    if (!query) {
        return NextResponse.json({ message: "Query not found or not authorized" }, { status: 404 });
    }

    // Create the reply
    const reply = await prisma.queryReply.create({
      data: {
        message,
        queryId,
        userId: session.user.id,
      },
    });

    // Update query status to IN_PROGRESS, especially if it was RESOLVED
    await prisma.helpQuery.update({
        where: { id: queryId },
        data: { status: 'IN_PROGRESS' }
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'PLATFORM_ADMIN' }
    });

    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `User Reply on Ticket: ${query.subject}`,
        html: adminNewReplyEmailTemplate({
            userName: session.user.name,
            querySubject: query.subject,
            userReply: message,
            queryLink: `${process.env.NEXT_PUBLIC_APP_URL}/admin/queries/${queryId}`
        })
      });
    }

    return NextResponse.json(reply, { status: 201 });

  } catch (error) {
    console.error("Error replying to query:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
} 