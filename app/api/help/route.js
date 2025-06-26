import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { sendEmail } from "@/app/lib/email";

const adminHelpQueryEmailTemplate = ({ userName, userEmail, subject, message }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Help Query</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 5px 5px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .info-box { border: 1px solid #e5e7eb; border-radius: 5px; padding: 15px; margin-top: 20px; }
    .info-box p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Help Query Received</h1>
    </div>
    <div class="content">
      <p>A new help query has been submitted through the platform.</p>
      <div class="info-box">
        <p><strong>From:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Subject:</strong> ${subject}</p>
      </div>
      <h3>Message:</h3>
      <p>${message}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const userHelpQueryConfirmationEmailTemplate = ({ userName, subject, message }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Help Query has been Received</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 5px 5px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .query-box { border-left: 3px solid #4f46e5; padding-left: 15px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>We've Received Your Query</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Thank you for reaching out to us. We have received your query and our team will get back to you as soon as possible.</p>
      <p>Here are the details of your submission:</p>
      <div class="query-box">
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      </div>
      <p>Best Regards,<br>The BroCode Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;


export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    const user = session.user;

    const { subject, message } = await req.json();

    if (!subject || !message) {
      return NextResponse.json({ message: "Subject and message are required" }, { status: 400 });
    }

    // Create a new help query in the database
    await prisma.helpQuery.create({
      data: {
        subject,
        message,
        userId: user.id,
      },
    });

    // Find all platform admins
    const admins = await prisma.user.findMany({
      where: {
        role: "PLATFORM_ADMIN",
      },
    });

    if (admins.length === 0) {
        // Fallback email if no admin is configured
        const adminEmail = process.env.ADMIN_EMAIL;
        if(adminEmail) {
            admins.push({ email: adminEmail, name: 'Platform Admin' });
        } else {
            console.error("No platform admins found and no fallback ADMIN_EMAIL is set.");
            return NextResponse.json({ message: "Could not send query, admin not configured." }, { status: 500 });
        }
    }

    // Send email to all admins
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `New Help Query: ${subject}`,
        html: adminHelpQueryEmailTemplate({
          userName: user.name,
          userEmail: user.email,
          subject,
          message,
        }),
      });
    }

    // Send confirmation email to the user
    await sendEmail({
      to: user.email,
      subject: "We've received your query!",
      html: userHelpQueryConfirmationEmailTemplate({
        userName: user.name,
        subject,
        message,
      }),
    });

    return NextResponse.json({ message: "Query submitted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error in help API:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
} 