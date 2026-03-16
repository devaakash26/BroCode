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
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Welcome to the BroCode | System Access Granted</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    
    /* Reset & Basics */
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Light Mode (Default) */
    .email-bg { background-color: #f4f4f5; }
    .card-bg { background-color: #ffffff; border: 1px solid #e4e4e7; }
    .text-primary { color: #18181b; }
    .text-secondary { color: #52525b; }
    .accent-bg { background-color: #4f46e5; } /* Indigo-600 */
    .accent-text { color: #4f46e5; }
    .code-block { background-color: #f4f4f5; border: 1px solid #e4e4e7; color: #db2777; font-family: 'Courier New', Courier, monospace; }
    .divider { border-top: 1px solid #e4e4e7; }
    
    /* Dark Mode Overrides */
    @media (prefers-color-scheme: dark) {
      body { background-color: #09090b !important; color: #e4e4e7 !important; }
      .email-bg { background-color: #09090b !important; }
      .card-bg { background-color: #18181b !important; border-color: #27272a !important; }
      .text-primary { color: #f4f4f5 !important; }
      .text-secondary { color: #a1a1aa !important; }
      .accent-bg { background-color: #6366f1 !important; } /* Indigo-500 */
      .accent-text { color: #818cf8 !important; }
      .code-block { background-color: #27272a !important; border-color: #3f3f46 !important; color: #f472b6 !important; }
      .divider { border-top-color: #27272a !important; }
    }
    
    /* Utilities */
    .wrapper { width: 100%; table-layout: fixed; padding-bottom: 40px; }
    .main-table { margin: 0 auto; max-width: 600px; width: 100%; border-spacing: 0; font-family: sans-serif; }
    .btn { display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; color: #ffffff !important; transition: all 0.2s; text-align: center; }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    
    /* Responsiveness */
    @media only screen and (max-width: 600px) {
      .main-table { width: 100% !important; padding: 0 10px; }
      .content-padding { padding: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 15px; }
    }
  </style>
</head>
<body class="email-bg">
  <center class="wrapper email-bg">
    <table class="main-table" role="presentation">
      <!-- Spacer -->
      <tr><td height="40"></td></tr>
      
      <!-- Logo / Brand Header -->
      <tr>
        <td style="text-align: center; padding-bottom: 24px;">
          <h1 class="text-primary" style="margin: 0; font-size: 28px; letter-spacing: -0.5px; font-weight: 800;">
            <span class="accent-text">&lt;/&gt;</span> BroCode
          </h1>
        </td>
      </tr>

      <!-- Main Card -->
      <tr>
        <td class="card-bg" style="border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Banner / Graphic Area -->
          <div class="accent-bg" style="height: 6px; width: 100%;"></div>
          
          <div class="content-padding" style="padding: 40px;">
            <!-- Greeting -->
            <h2 class="text-primary" style="margin-top: 0; margin-bottom: 16px; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
              System Initialized. <br>
              Welcome, <span class="accent-text">${name}</span>!
            </h2>
            
            <p class="text-secondary" style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
              Your sleek new development environment is ready. You've just joined the most robust community for mastering the art of code.
            </p>

            <!-- Code Snippet Visual -->
            <div class="code-block" style="padding: 20px; border-radius: 12px; margin-bottom: 28px; font-size: 13px; line-height: 1.5; overflow-x: auto;">
              <div style="margin-bottom: 4px;"><span style="opacity: 0.5; margin-right: 12px;">1</span><span style="color: #a855f7;">const</span> <span style="color: #3b82f6;">developer</span> = <span style="color: #a855f7;">new</span> <span style="color: #eab308;">User</span>({</div>
              <div style="margin-bottom: 4px;"><span style="opacity: 0.5; margin-right: 12px;">2</span>&nbsp;&nbsp;name: <span style="color: #10b981;">"${name}"</span>,</div>
              <div style="margin-bottom: 4px;"><span style="opacity: 0.5; margin-right: 12px;">3</span>&nbsp;&nbsp;status: <span style="color: #10b981;">"READY_TO_CODE"</span>,</div>
              <div style="margin-bottom: 4px;"><span style="opacity: 0.5; margin-right: 12px;">4</span>&nbsp;&nbsp;skills: [<span style="color: #10b981;">"Algorithms"</span>, <span style="color: #10b981;">"System Design"</span>]</div>
              <div style="margin-bottom: 4px;"><span style="opacity: 0.5; margin-right: 12px;">5</span>});</div>
              <div style="margin-bottom: 4px;"><span style="opacity: 0.5; margin-right: 12px;">6</span></div>
              <div><span style="opacity: 0.5; margin-right: 12px;">7</span><span style="color: #3b82f6;">developer</span>.<span style="color: #eab308;">startJourney</span>();</div>
            </div>

            <p class="text-secondary" style="margin: 0 0 32px; font-size: 16px; line-height: 1.6;">
              We've curated everything you need to level up. From complex algorithm challenges to real-time collaborative coding sessions—it's all here.
            </p>

            <!-- CTA Button -->
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
              <tr>
                <td align="center">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn accent-bg">
                    Launch Dashboard &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <!-- Feature Grid (2 Cols) -->
          <div class="divider"></div>
          
          <div class="content-padding" style="padding: 30px 40px; background-color: rgba(128, 128, 128, 0.03);">
             <table width="100%" border="0" cellspacing="0" cellpadding="0">
               <tr>
                 <td class="mobile-stack" width="48%" style="vertical-align: top;">
                   <h3 class="text-primary" style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">🔥 Daily Challenges</h3>
                   <p class="text-secondary" style="margin: 0; font-size: 14px; line-height: 1.5;">Keep your streak alive and sharpen your logic every single day.</p>
                 </td>
                 <td class="mobile-stack" width="4%" style="font-size: 0;">&nbsp;</td>
                 <td class="mobile-stack" width="48%" style="vertical-align: top;">
                   <h3 class="text-primary" style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">👥 Peer Programming</h3>
                   <p class="text-secondary" style="margin: 0; font-size: 14px; line-height: 1.5;">Code live with friends or random peers to simulate real interviews.</p>
                 </td>
               </tr>
             </table>
          </div>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="text-align: center; padding-top: 32px;">
          <p class="text-secondary" style="font-size: 12px; margin-bottom: 12px; opacity: 0.7;">
            &copy; ${new Date().getFullYear()} BroCode Inc. <br>
            Designed for Developers.
          </p>
          <div style="font-size: 12px; opacity: 0.7;">
            <a href="#" class="text-secondary" style="text-decoration: underline; margin: 0 8px;">Privacy</a>
            <span class="text-secondary">•</span>
            <a href="#" class="text-secondary" style="text-decoration: underline; margin: 0 8px;">Unsubscribe</a>
          </div>
        </td>
      </tr>
      <tr><td height="40"></td></tr>
    </table>
  </center>
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
