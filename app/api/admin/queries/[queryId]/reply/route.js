import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/app/lib/email";

const queryReplyEmailTemplate = ({ userName, querySubject, replyMessage, queryLink }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>An Admin has Replied to Your Query</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 5px 5px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .reply-box { border-left: 3px solid #4f46e5; padding-left: 15px; margin-top: 20px; background-color: #ffffff; padding: 15px; border-radius: 5px; }
    .button { display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Admin Reply to Your Query</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>An administrator has responded to your support query regarding: <strong>"${querySubject}"</strong>.</p>
      <div class="reply-box">
        <p><strong>Admin's Reply:</strong></p>
        <p>${replyMessage}</p>
      </div>
      <p>You can view the full conversation and reply by visiting your support ticket page.</p>
      <p style="text-align: center;">
        <a href="${queryLink}" class="button">View Query</a>
      </p>
      <p>Best Regards,<br>The BroCode Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const { queryId } = params;
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ message: "Reply message is required" }, { status: 400 });
    }

    // Create the reply
    const reply = await prisma.queryReply.create({
      data: {
        message,
        queryId,
        userId: session.user.id,
      },
    });

    // Update the query status to "IN_PROGRESS"
    const updatedQuery = await prisma.helpQuery.update({
      where: { id: queryId },
      data: { status: 'IN_PROGRESS' },
      include: { user: true }
    });

    // Send email to user
    await sendEmail({
      to: updatedQuery.user.email,
      subject: `Re: Your Support Query: ${updatedQuery.subject}`,
      html: queryReplyEmailTemplate({
        userName: updatedQuery.user.name,
        querySubject: updatedQuery.subject,
        replyMessage: message,
        queryLink: `${process.env.NEXT_PUBLIC_APP_URL}/profile/queries/${queryId}` // This page does not exist yet
      }),
    });

    return NextResponse.json(reply, { status: 201 });

  } catch (error) {
    console.error("Error replying to query:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
} 