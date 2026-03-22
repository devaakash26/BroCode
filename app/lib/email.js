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
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Verify Your Email Address</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #e5e7eb; margin: 0; padding: 0; background-color: #0c0c0c; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background-color: #1a1a1a; border-radius: 0 0 8px 8px; }
    .content p { color: #9ca3af; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
    
    @media (prefers-color-scheme: light) {
      body { background-color: #ffffff !important; color: #1f2937 !important; }
      .content { background-color: #f9fafb !important; }
      .content p { color: #4b5563 !important; }
      .footer { color: #6b7280 !important; }
    }
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
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Reset Your Password</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #e5e7eb; margin: 0; padding: 0; background-color: #0c0c0c; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background-color: #1a1a1a; border-radius: 0 0 8px 8px; }
    .content p { color: #9ca3af; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
    
    @media (prefers-color-scheme: light) {
      body { background-color: #ffffff !important; color: #1f2937 !important; }
      .content { background-color: #f9fafb !important; }
      .content p { color: #4b5563 !important; }
      .footer { color: #6b7280 !important; }
    }
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
const welcomeEmailTemplate = ({ name }) => {
  const date = new Date();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Welcome to BroCode</title>
  <style>
    /* Reset & Basics */
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0c0c; color: #e5e7eb; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    /* Light Mode Overrides with !important to ensure they work when supported */
    @media (prefers-color-scheme: light) {
      body, .bg-body { background-color: #ffffff !important; color: #1f2937 !important; }
      .container { border-color: #e5e7eb !important; }
      .headline { color: #111827 !important; }
      .intro, .main-text, .list-desc, .cta-text, .date { color: #4b5563 !important; }
      .intro strong, .main-text strong { color: #111827 !important; }
      .list-title { color: #111827 !important; }
      .list-section, .list-item, .cta-section, .header-table { border-color: #e5e7eb !important; }
      .list-num { color: #9ca3af !important; }
      .btn { border-color: #1f2937 !important; color: #1f2937 !important; background-color: transparent !important; }
      .btn:hover { background-color: #1f2937 !important; color: #ffffff !important; }
      .footer-brand { color: #374151 !important; }
      .footer-links a { color: #4b5563 !important; }
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .headline { font-size: 32px !important; }
      .intro { font-size: 16px !important; }
      .cta-text { display: block !important; width: 100% !important; margin-bottom: 20px !important; }
      .cta-btn-cell { display: block !important; text-align: left !important; }
      .footer-links { text-align: left !important; margin-top: 15px !important; }
      .footer-links a { margin-left: 0 !important; margin-right: 15px !important; }
    }
  </style>
</head>
<body class="bg-body" style="margin: 0; padding: 0; width: 100% !important; background-color: #0c0c0c; color: #e5e7eb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Top Bar -->
    <table class="header-table" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 60px; border-bottom: 1px solid #333333; padding-bottom: 20px;">
      <tr>
        <td class="brand" style="font-family: 'Courier New', Courier, monospace; letter-spacing: 1px; font-size: 14px; font-weight: 700; color: #e5e7eb; text-transform: uppercase;">
          Bro<span class="dot" style="color: #4f46e5;">.</span>Code
        </td>
        <td class="date" style="text-align: right; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
          Welcome — ${month} ${year}
        </td>
      </tr>
    </table>

    <!-- Hero Section -->
    <div class="hero" style="margin-bottom: 50px;">
      <div class="eyebrow" style="font-family: 'Courier New', Courier, monospace; color: #6366f1; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; margin-bottom: 20px;">
        ACCOUNT ACTIVATED
      </div>
      
      <h1 class="headline" style="font-family: Georgia, 'Times New Roman', serif; font-size: 42px; line-height: 1.1; margin: 0 0 30px; font-weight: 400; color: #e5e7eb;">
        Good to have <br>
        you, <span class="name-accent" style="color: #818cf8; font-style: italic;">${name}</span>.
      </h1>
      
      <div class="hero-divider" style="width: 40px; height: 2px; background-color: #4f46e5; margin-bottom: 30px;"></div>
      
      <p class="intro" style="font-size: 18px; line-height: 1.6; color: #9ca3af; margin: 0; max-width: 90%;">
        Your account is live. Below is everything you need to know — read it once, then go build something <strong style="color: #e5e7eb;">worth shipping</strong>.
      </p>
    </div>

    <!-- Main Text -->
    <div class="main-text" style="font-size: 16px; line-height: 1.6; margin-bottom: 50px; color: #9ca3af;">
      BroCode is built for engineers who are <strong style="color: #e5e7eb;">serious about the craft</strong> — not just grinding LeetCode, but understanding the depth behind every problem you solve.
    </div>

    <!-- Features List -->
    <div class="list-section" style="margin-bottom: 60px; padding-top: 20px; border-top: 1px solid #1f2937;">
      <!-- Item 01 -->
      <table class="list-item" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 1px solid #1f2937;">
        <tr>
          <td class="list-num" style="width: 40px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #4b5563; padding-right: 20px; vertical-align: top; padding: 25px 0;">01</td>
          <td class="list-content" style="vertical-align: top; padding: 25px 0;">
            <div class="list-title" style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #e5e7eb;">CURATED PROBLEMS</div>
            <p class="list-desc" style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0;">Hand-picked problems grouped by topic and difficulty — signal, not noise. No filler.</p>
          </td>
        </tr>
      </table>
      
      <!-- Item 02 -->
      <table class="list-item" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 1px solid #1f2937;">
        <tr>
          <td class="list-num" style="width: 40px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #4b5563; padding-right: 20px; vertical-align: top; padding: 25px 0;">02</td>
          <td class="list-content" style="vertical-align: top; padding: 25px 0;">
            <div class="list-title" style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #e5e7eb;">STUDY GROUPS</div>
            <p class="list-desc" style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0;">Pair up with engineers at your level. Review together, sharpen together.</p>
          </td>
        </tr>
      </table>

      <!-- Item 03 -->
      <table class="list-item" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 1px solid #1f2937;">
        <tr>
          <td class="list-num" style="width: 40px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #4b5563; padding-right: 20px; vertical-align: top; padding: 25px 0;">03</td>
          <td class="list-content" style="vertical-align: top; padding: 25px 0;">
            <div class="list-title" style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #e5e7eb;">TIMED CHALLENGES</div>
            <p class="list-desc" style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0;">Pressure is practice. Enter challenges and track where you hold — and where you fold.</p>
          </td>
        </tr>
      </table>

      <!-- Item 04 -->
      <table class="list-item" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: none;">
        <tr>
          <td class="list-num" style="width: 40px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #4b5563; padding-right: 20px; vertical-align: top; padding: 25px 0;">04</td>
          <td class="list-content" style="vertical-align: top; padding: 25px 0;">
            <div class="list-title" style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #e5e7eb;">PROGRESS METRICS</div>
            <p class="list-desc" style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0;">Detailed stats on every session. Know your weak spots before the interview does.</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Area -->
    <div class="cta-section" style="margin-bottom: 60px; padding: 40px 0; border-top: 1px solid #1f2937; border-bottom: 1px solid #1f2937;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td class="cta-text" style="font-size: 16px; color: #9ca3af; line-height: 1.5; padding-right: 20px; width: 60%;">
            Your dashboard is ready. First problem's already waiting for you.
          </td>
          <td class="cta-btn-cell" style="text-align: right; vertical-align: middle;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn" style="display: inline-block; padding: 12px 24px; border: 1px solid #e5e7eb; color: #e5e7eb; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-radius: 4px; white-space: nowrap; transition: all 0.2s; font-family: 'Courier New', Courier, monospace;">START CODING &rarr;</a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <table class="footer" width="100%" cellpadding="0" cellspacing="0" style="padding-top: 20px;">
      <tr>
        <td class="footer-brand" style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; color: #4b5563; font-size: 14px;">The BroCode Team</td>
        <td class="footer-links" style="text-align: right;">
          <a href="#" style="color: #4b5563; text-decoration: none; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-left: 15px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">UNSUBSCRIBE</a>
          <a href="#" style="color: #4b5563; text-decoration: none; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-left: 15px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">SUPPORT</a>
          <a href="#" style="color: #4b5563; text-decoration: none; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-left: 15px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">PRIVACY</a>
        </td>
      </tr>
    </table>

  </div>
</body>
</html>
`;
};

// Send verification email
export async function sendVerificationEmail({ name, to, verificationLink }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify Your Email Address - BroCode",
    html: verificationEmailTemplate({ name, verificationLink }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`Error sending verification email to ${to}:`, error);
    return { success: false, error };
  }
}

// Send welcome email
export async function sendWelcomeEmail({ name, to }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to BroCode",
    html: welcomeEmailTemplate({ name }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`Error sending welcome email to ${to}:`, error);
    return { success: false, error };
  }
}

// Email template for invitation
const invitationEmailTemplate = ({ inviterName, invitationLink, role }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>You've Been Invited to BroCode</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #e5e7eb; margin: 0; padding: 0; background-color: #0c0c0c; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .content { padding: 30px; background-color: #1a1a1a; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }
    .content p { color: #9ca3af; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; padding: 20px; }
    
    @media (prefers-color-scheme: light) {
      body { background-color: #f3f4f6 !important; color: #1f2937 !important; }
      .content { background-color: white !important; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important; }
      .content p { color: #4b5563 !important; }
      .footer { color: #6b7280 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You've Been Invited!</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join BroCode${role ? ` as a <strong>${role}</strong>` : ""}.</p>
      <p>BroCode is a platform for engineers who are serious about mastering coding problems and improving their technical skills.</p>
      <p style="text-align: center;">
        <a href="${invitationLink}" class="button">Accept Invitation</a>
      </p>
      <p>This invitation link will expire in 7 days.</p>
      <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
      <p style="word-break: break-all;">${invitationLink}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BroCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Group invitation email template
const groupInvitationEmailTemplate = ({ 
  inviterName, 
  groupName, 
  groupDescription,
  joinLink 
}) => {
  const now = new Date();
  const month = now.toLocaleString('en', { month: 'short' }).toUpperCase();
  const year = now.getFullYear();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Join ${groupName} on BroCode</title>
  <style>
    /* Reset & Basics */
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0c0c; color: #e5e7eb; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    /* Light Mode Overrides */
    @media (prefers-color-scheme: light) {
      body, .bg-body { background-color: #ffffff !important; color: #1f2937 !important; }
      .container { border-color: #e5e7eb !important; }
      .headline { color: #111827 !important; }
      .intro, .main-text, .list-desc, .date { color: #4b5563 !important; }
      .intro strong, .main-text strong { color: #111827 !important; }
      .list-title { color: #111827 !important; }
      .list-section, .list-item, .cta-section, .header-table { border-color: #e5e7eb !important; }
      .list-num { color: #9ca3af !important; }
      .btn { border-color: #1f2937 !important; color: #1f2937 !important; background-color: transparent !important; }
      .btn:hover { background-color: #1f2937 !important; color: #ffffff !important; }
      .footer-brand { color: #374151 !important; }
      .footer-links a { color: #4b5563 !important; }
      .group-name { color: #4f46e5 !important; }
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .headline { font-size: 28px !important; }
      .intro { font-size: 16px !important; }
      .footer-links { text-align: left !important; margin-top: 15px !important; }
      .footer-links a { margin-left: 0 !important; margin-right: 15px !important; }
    }
  </style>
</head>
<body class="bg-body" style="margin: 0; padding: 0; width: 100% !important; background-color: #0c0c0c; color: #e5e7eb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Top Bar -->
    <table class="header-table" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 60px; border-bottom: 1px solid #333333; padding-bottom: 20px;">
      <tr>
        <td class="brand" style="font-family: 'Courier New', Courier, monospace; letter-spacing: 1px; font-size: 14px; font-weight: 700; color: #e5e7eb; text-transform: uppercase;">
          Bro<span class="dot" style="color: #4f46e5;">.</span>Code
        </td>
        <td class="date" style="text-align: right; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
          Invitation — ${month} ${year}
        </td>
      </tr>
    </table>

    <!-- Hero Section -->
    <div class="hero" style="margin-bottom: 50px;">
      <div class="eyebrow" style="font-family: 'Courier New', Courier, monospace; color: #6366f1; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; margin-bottom: 20px;">
        GROUP INVITATION
      </div>
      
      <h1 class="headline" style="font-family: Georgia, 'Times New Roman', serif; font-size: 36px; line-height: 1.2; margin: 0 0 30px; font-weight: 400; color: #e5e7eb;">
        <span class="inviter-name" style="color: #818cf8; font-style: italic;">${inviterName}</span><br>
        invited you to<br>
        <span class="group-name" style="color: #818cf8; font-style: italic;">${groupName}</span>
      </h1>
      
      <div class="hero-divider" style="width: 40px; height: 2px; background-color: #4f46e5; margin-bottom: 30px;"></div>
      
      <p class="intro" style="font-size: 18px; line-height: 1.6; color: #9ca3af; margin: 0; max-width: 90%;">
        ${groupDescription || 'Join this study group to collaborate with fellow engineers, compete in challenges, and sharpen your skills together.'}
      </p>
    </div>

    <!-- Main Text -->
    <div class="main-text" style="font-size: 16px; line-height: 1.6; margin-bottom: 50px; color: #9ca3af;">
      Study groups are where engineers <strong style="color: #e5e7eb;">level up together</strong> — solving curated problems, competing in real-time, and pushing each other to improve.
    </div>

    <!-- Features List -->
    <div class="list-section" style="margin-bottom: 60px; padding-top: 20px; border-top: 1px solid #1f2937;">
      <!-- Item 01 -->
      <table class="list-item" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 1px solid #1f2937;">
        <tr>
          <td class="list-num" style="width: 40px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #4b5563; padding-right: 20px; vertical-align: top; padding: 25px 0;">01</td>
          <td class="list-content" style="vertical-align: top; padding: 25px 0;">
            <div class="list-title" style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #e5e7eb;">SOLVE TOGETHER</div>
            <p class="list-desc" style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0;">Work through curated coding challenges as a team. Share approaches and learn from each other.</p>
          </td>
        </tr>
      </table>
      
      <!-- Item 02 -->
      <table class="list-item" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 1px solid #1f2937;">
        <tr>
          <td class="list-num" style="width: 40px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #4b5563; padding-right: 20px; vertical-align: top; padding: 25px 0;">02</td>
          <td class="list-content" style="vertical-align: top; padding: 25px 0;">
            <div class="list-title" style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #e5e7eb;">COMPETE LIVE</div>
            <p class="list-desc" style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0;">Join timed coding competitions. See where you rank and what needs work under pressure.</p>
          </td>
        </tr>
      </table>

      <!-- Item 03 -->
      <table class="list-item" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 1px solid #1f2937;">
        <tr>
          <td class="list-num" style="width: 40px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #4b5563; padding-right: 20px; vertical-align: top; padding: 25px 0;">03</td>
          <td class="list-content" style="vertical-align: top; padding: 25px 0;">
            <div class="list-title" style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #e5e7eb;">REAL-TIME CHAT</div>
            <p class="list-desc" style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0;">Discuss strategies, debug together, and share solutions in the group chat.</p>
          </td>
        </tr>
      </table>

      <!-- Item 04 -->
      <table class="list-item" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: none;">
        <tr>
          <td class="list-num" style="width: 40px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #4b5563; padding-right: 20px; vertical-align: top; padding: 25px 0;">04</td>
          <td class="list-content" style="vertical-align: top; padding: 25px 0;">
            <div class="list-title" style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #e5e7eb;">TRACK PROGRESS</div>
            <p class="list-desc" style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0;">See your rankings, stats, and improvement over time within the group leaderboard.</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Area -->
    <div class="cta-section" style="margin-bottom: 40px; padding: 40px 30px; border-top: 1px solid #1f2937; border-bottom: 1px solid #1f2937; text-align: center;">
      <p style="font-size: 16px; color: #9ca3af; margin-bottom: 24px;">
        This invitation is valid for 7 days.
      </p>
      <a href="${joinLink}" class="btn" style="display: inline-block; padding: 12px 24px; border: 1px solid #e5e7eb; color: #e5e7eb; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-radius: 4px; white-space: nowrap; transition: all 0.2s; font-family: 'Courier New', Courier, monospace;">JOIN ${groupName.toUpperCase()} &rarr;</a>
      
      <p style="font-size: 12px; color: #6b7280; margin-top: 24px; line-height: 1.4;">
        If the button doesn't work, copy this link:<br>
        <span style="word-break: break-all;">${joinLink}</span>
      </p>
    </div>

    <!-- Footer -->
    <table class="footer" width="100%" cellpadding="0" cellspacing="0" style="padding-top: 20px;">
      <tr>
        <td class="footer-brand" style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; color: #4b5563; font-size: 14px;">The BroCode Team</td>
        <td class="footer-links" style="text-align: right;">
          <a href="#" style="color: #4b5563; text-decoration: none; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-left: 15px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">SUPPORT</a>
          <a href="#" style="color: #4b5563; text-decoration: none; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-left: 15px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">PRIVACY</a>
        </td>
      </tr>
    </table>

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

// Send group invitation email
export async function sendGroupInvitationEmail({
  to,
  inviterName,
  groupName,
  groupDescription,
  joinLink,
}) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${inviterName} invited you to join ${groupName} on BroCode`,
    html: groupInvitationEmailTemplate({ 
      inviterName, 
      groupName, 
      groupDescription,
      joinLink 
    }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Group invitation email sent to ${to} for group "${groupName}"`);
    return { success: true };
  } catch (error) {
    console.error(`Error sending group invitation email to ${to}:`, error);
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
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Challenge Completed - ${challengeTitle}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #e5e7eb; margin: 0; padding: 0; background-color: #0c0c0c; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 30px; background-color: #1a1a1a; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }
    .congrats { text-align: center; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; margin-bottom: 20px; }
    .congrats h2 { margin: 0 0 5px 0; color: #92400e; font-size: 20px; }
    .congrats p { margin: 0; color: #78350f; font-size: 14px; }
    .rank-badge { display: inline-block; font-size: 48px; margin: 10px 0; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
    .stat-card { background-color: #262626; border: 2px solid #404040; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-card.highlight { border-color: ${rankColor}; background-color: ${rank <= 3 ? "#422006" : "#262626"}; }
    .stat-label { font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #f3f4f6; }
    .stat-subtext { font-size: 12px; color: #6b7280; margin-top: 3px; }
    .progress-bar { background-color: #404040; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%); transition: width 0.3s ease; }
    .info-section { margin: 20px 0; padding: 15px; background-color: #262626; border-left: 4px solid #4f46e5; border-radius: 4px; }
    .info-section h3 { margin: 0 0 10px 0; font-size: 14px; color: #818cf8; text-transform: uppercase; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
    .info-label { color: #9ca3af; }
    .info-value { font-weight: bold; color: #f3f4f6; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; padding: 20px; }
    .message { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; line-height: 1.6; }
    
    @media (prefers-color-scheme: light) {
      body { background-color: #f3f4f6 !important; color: #1f2937 !important; }
      .content { background-color: white !important; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important; }
      .stat-card { background-color: #f9fafb !important; border-color: #e5e7eb !important; }
      .stat-card.highlight { background-color: ${rank <= 3 ? "#fef3c7" : "#f9fafb"} !important; }
      .stat-label { color: #6b7280 !important; }
      .stat-value { color: #111827 !important; }
      .stat-subtext { color: #9ca3af !important; }
      .progress-bar { background-color: #e5e7eb !important; }
      .info-section { background-color: #f9fafb !important; }
      .info-section h3 { color: #4f46e5 !important; }
      .info-label { color: #6b7280 !important; }
      .info-value { color: #111827 !important; }
      .message { color: #4b5563 !important; }
    }
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
