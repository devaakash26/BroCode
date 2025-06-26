import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/app/lib/email";

const queryResolvedEmailTemplate = ({ userName, querySubject, queryLink }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Query has been Resolved</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 5px 5px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .button { display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Query Resolved</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your support query with the subject: "<strong>${querySubject}</strong>" has been marked as resolved by our team.</p>
      <p>If you feel this issue hasn't been fully addressed, you can reopen the query by replying to it.</p>
      <p>You can view the full conversation history by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${queryLink}" class="button">View Conversation</a>
      </p>
      <p>Thank you for using our platform!</p>
      <p>Best Regards,<br>The BroCode Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const { queryId } = params;

    const updatedQuery = await prisma.helpQuery.update({
      where: { id: queryId },
      data: { status: 'RESOLVED' },
      include: { user: true },
    });

    await sendEmail({
      to: updatedQuery.user.email,
      subject: `Your Support Query has been Resolved: ${updatedQuery.subject}`,
      html: queryResolvedEmailTemplate({
        userName: updatedQuery.user.name,
        querySubject: updatedQuery.subject,
        queryLink: `${process.env.NEXT_PUBLIC_APP_URL}/profile/queries/${queryId}`
      }),
    });

    return NextResponse.json(updatedQuery, { status: 200 });
  } catch (error) {
    console.error("Error resolving query:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
} 