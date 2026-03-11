async function getTransporter() {
  const nodemailer = (await import("nodemailer")).default;
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

// Email template for verification
const verificationEmailTemplate = ({ name, verificationLink }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email Address</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email Address</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Thank you for creating an account on BroCode. To complete your registration and access all features, please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${verificationLink}" class="button">Verify Email Address</a>
      </p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>This verification link will expire in 24 hours.</p>
      <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
      <p>${verificationLink}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Email template for password reset
const passwordResetEmailTemplate = ({ name, resetLink }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>We received a request to reset your password for your BroCode account. Click the button below to create a new password:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>This password reset link will expire in 1 hour.</p>
      <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
      <p>${resetLink}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Email template for welcome email
const welcomeEmailTemplate = ({ name }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BroCode!</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .feature { margin-bottom: 15px; }
    .feature-title { font-weight: bold; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to BroCode!</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Thank you for joining BroCode! We're excited to have you on board.</p>
      
      <p>BroCode is a platform designed to help you master coding interviews and improve your problem-solving skills. Here are some features to get you started:</p>
      
      <div class="feature">
        <div class="feature-title">🧩 Curated Problems</div>
        <div>Access a carefully selected collection of coding problems organized by topic and difficulty.</div>
      </div>
      
      <div class="feature">
        <div class="feature-title">👥 Join Groups</div>
        <div>Collaborate with other developers, join study groups, and participate in group challenges.</div>
      </div>
      
      <div class="feature">
        <div class="feature-title">🏆 Challenges</div>
        <div>Test your skills with timed challenges and track your progress over time.</div>
      </div>
      
      <div class="feature">
        <div class="feature-title">📊 Progress Tracking</div>
        <div>Monitor your growth with detailed statistics and performance metrics.</div>
      </div>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Start Coding Now</a>
      </p>
      
      <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
      
      <p>Happy coding!</p>
      <p>The BroCode Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Email template for user invitation
const invitationEmailTemplate = ({ inviterName, invitationLink, role }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Invited to BroCode</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { padding: 30px; background-color: #f9fafb; border-radius: 0 0 5px 5px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; margin: 20px 0; font-weight: bold; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25); }
    .button:hover { background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%); }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .role-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
    .platform-admin { background-color: #9333ea; color: white; }
    .group-admin { background-color: #3b82f6; color: white; }
    .user { background-color: #6b7280; color: white; }
    .divider { height: 1px; background-color: #e5e7eb; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You've Been Invited to BroCode</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join BroCode as a:</p>
      
      <div style="text-align: center;">
        <span class="role-badge ${role === "PLATFORM_ADMIN" ? "platform-admin" : role === "GROUP_ADMIN" ? "group-admin" : "user"}">
          ${role === "PLATFORM_ADMIN" ? "Platform Admin" : role === "GROUP_ADMIN" ? "Group Admin" : "User"}
        </span>
      </div>
      
      <div class="divider"></div>
      
      <p>BroCode is a platform designed to help developers master coding interviews and improve their problem-solving skills with:</p>
      
      <ul>
        <li>Curated coding problems organized by topic and difficulty</li>
        <li>Collaborative study groups and challenges</li>
        <li>Performance tracking and analytics</li>
        <li>Community discussions and support</li>
      </ul>
      
      <p style="text-align: center;">
        <a href="${invitationLink}" class="button">Accept Invitation</a>
      </p>
      
      <p><strong>This invitation link will expire in 7 days.</strong></p>
      
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #4f46e5;">${invitationLink}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Send verification email
export async function sendVerificationEmail({ to, name, verificationLink }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify Your Email Address",
    html: verificationEmailTemplate({ name, verificationLink }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error };
  }
}

// Send password reset email
export async function sendPasswordResetEmail({ to, name, resetLink }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Your Password",
    html: passwordResetEmailTemplate({ name, resetLink }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error };
  }
}

// Send welcome email
export async function sendWelcomeEmail({ to, name }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to BroCode!",
    html: welcomeEmailTemplate({ name }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, error };
  }
}

// Send invitation email
export async function sendInvitationEmail({
  to,
  inviterName,
  invitationLink,
  role,
}) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: "You've Been Invited to BroCode",
    html: invitationEmailTemplate({ inviterName, invitationLink, role }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return { success: false, error };
  }
}

// Generic email sending function
export async function sendEmail({ to, subject, html }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to} with subject "${subject}"`);
    return { success: true };
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return { success: false, error };
  }
}

// Email template for challenge report card
const challengeReportCardTemplate = ({
  userName,
  challengeTitle,
  groupName,
  rank,
  totalParticipants,
  problemsSolved,
  totalProblems,
  finalScore,
  startTime,
  endTime,
}) => {
  const duration = Math.round(
    (new Date(endTime) - new Date(startTime)) / (1000 * 60),
  ); // minutes
  const percentSolved =
    totalProblems > 0 ? Math.round((problemsSolved / totalProblems) * 100) : 0;

  // Determine medal emoji based on rank
  let medalEmoji = "";
  let rankColor = "#6b7280";
  if (rank === 1) {
    medalEmoji = "🥇";
    rankColor = "#f59e0b";
  } else if (rank === 2) {
    medalEmoji = "🥈";
    rankColor = "#9ca3af";
  } else if (rank === 3) {
    medalEmoji = "🥉";
    rankColor = "#ea580c";
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Challenge Completed - ${challengeTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 30px; background-color: white; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .congrats { text-align: center; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; margin-bottom: 20px; }
    .congrats h2 { margin: 0 0 5px 0; color: #92400e; font-size: 20px; }
    .congrats p { margin: 0; color: #78350f; font-size: 14px; }
    .rank-badge { display: inline-block; font-size: 48px; margin: 10px 0; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
    .stat-card { background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-card.highlight { border-color: ${rankColor}; background-color: ${rank <= 3 ? "#fef3c7" : "#f9fafb"}; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #111827; }
    .stat-subtext { font-size: 12px; color: #9ca3af; margin-top: 3px; }
    .progress-bar { background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%); transition: width 0.3s ease; }
    .info-section { margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #4f46e5; border-radius: 4px; }
    .info-section h3 { margin: 0 0 10px 0; font-size: 14px; color: #4f46e5; text-transform: uppercase; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
    .info-label { color: #6b7280; }
    .info-value { font-weight: bold; color: #111827; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; padding: 20px; }
    .message { text-align: center; padding: 20px; color: #4b5563; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Challenge Completed!</h1>
      <p>${challengeTitle}</p>
    </div>
    <div class="content">
      ${
        rank <= 3
          ? `
      <div class="congrats">
        <div class="rank-badge">${medalEmoji}</div>
        <h2>Amazing Performance!</h2>
        <p>You ranked ${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : "rd"} place out of ${totalParticipants} participants!</p>
      </div>
      `
          : `
      <div class="message">
        <p>Thank you for participating in <strong>${challengeTitle}</strong>!</p>
        <p>Here's your final report card with your performance summary.</p>
      </div>
      `
      }

      <div class="stats-grid">
        <div class="stat-card highlight">
          <div class="stat-label">Your Rank</div>
          <div class="stat-value">${rank}</div>
          <div class="stat-subtext">out of ${totalParticipants}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Final Score</div>
          <div class="stat-value">${finalScore}</div>
          <div class="stat-subtext">points</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Problems Solved</div>
          <div class="stat-value">${problemsSolved}/${totalProblems}</div>
          <div class="stat-subtext">${percentSolved}% completion</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentSolved}%"></div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Duration</div>
          <div class="stat-value">${duration}</div>
          <div class="stat-subtext">minutes</div>
        </div>
      </div>

      <div class="info-section">
        <h3>Challenge Details</h3>
        <div class="info-row">
          <span class="info-label">Group:</span>
          <span class="info-value">${groupName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Started:</span>
          <span class="info-value">${new Date(startTime).toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Ended:</span>
          <span class="info-value">${new Date(endTime).toLocaleString()}</span>
        </div>
      </div>

      <div class="message">
        <p><strong>Thank you for participating!</strong></p>
        <p>Keep practicing and improving your skills. Every challenge is an opportunity to learn and grow.</p>
        <p>Happy coding! 💻</p>
      </div>

      <div style="text-align: center; margin-top: 25px;">
        <p style="font-size: 14px; color: #6b7280;">Looking for more challenges?</p>
        <a href="${process.env.NEXTAUTH_URL}/challenges" 
           style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 10px;">
          Browse Challenges
        </a>
      </div>
    </div>
    <div class="footer">
      <p>Thanks for being part of <strong>${groupName}</strong>!</p>
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
};

// Send challenge report card email
export async function sendChallengeReportCard(data) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to: data.userEmail,
    subject: `Challenge Completed: ${data.challengeTitle} - Your Report Card`,
    html: challengeReportCardTemplate(data),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Challenge report card sent to ${data.userEmail}`);
    return { success: true };
  } catch (error) {
    console.error(
      `Error sending challenge report card to ${data.userEmail}:`,
      error,
    );
    return { success: false, error };
  }
}
