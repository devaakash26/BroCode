async function getTransporter() {
  const nodemailer = (await import('nodemailer')).default;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

// Email template for verification
const  verificationEmailTemplate = ({ name, verificationLink }) => `
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
        <span class="role-badge ${role === 'PLATFORM_ADMIN' ? 'platform-admin' : role === 'GROUP_ADMIN' ? 'group-admin' : 'user'}">
          ${role === 'PLATFORM_ADMIN' ? 'Platform Admin' : role === 'GROUP_ADMIN' ? 'Group Admin' : 'User'}
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
    subject: 'Verify Your Email Address',
    html: verificationEmailTemplate({ name, verificationLink }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error };
  }
}

// Send password reset email
export async function sendPasswordResetEmail({ to, name, resetLink }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset Your Password',
    html: passwordResetEmailTemplate({ name, resetLink }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error };
  }
}

// Send welcome email
export async function sendWelcomeEmail({ to, name }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to BroCode!',
    html: welcomeEmailTemplate({ name }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error };
  }
}

// Send invitation email
export async function sendInvitationEmail({ to, inviterName, invitationLink, role }) {
  const mailOptions = {
    from: `"BroCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'You\'ve Been Invited to BroCode',
    html: invitationEmailTemplate({ inviterName, invitationLink, role }),
  };

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
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
