import nodemailer from 'nodemailer';

// Create a transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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
      <p>Thank you for creating an account on NeetCode. To complete your registration and access all features, please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${verificationLink}" class="button">Verify Email Address</a>
      </p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>This verification link will expire in 24 hours.</p>
      <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
      <p>${verificationLink}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NeetCode. All rights reserved.</p>
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
      <p>We received a request to reset your password for your NeetCode account. Click the button below to create a new password:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>This password reset link will expire in 1 hour.</p>
      <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
      <p>${resetLink}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NeetCode. All rights reserved.</p>
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
  <title>Welcome to NeetCode!</title>
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
      <h1>Welcome to NeetCode!</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Thank you for joining NeetCode! We're excited to have you on board.</p>
      
      <p>NeetCode is a platform designed to help you master coding interviews and improve your problem-solving skills. Here are some features to get you started:</p>
      
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
      <p>The NeetCode Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NeetCode. All rights reserved.</p>
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
  <title>You've Been Invited to NeetCode</title>
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
      <h1>You've Been Invited to NeetCode</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join NeetCode as a:</p>
      
      <div style="text-align: center;">
        <span class="role-badge ${role === 'PLATFORM_ADMIN' ? 'platform-admin' : role === 'GROUP_ADMIN' ? 'group-admin' : 'user'}">
          ${role === 'PLATFORM_ADMIN' ? 'Platform Admin' : role === 'GROUP_ADMIN' ? 'Group Admin' : 'User'}
        </span>
      </div>
      
      <div class="divider"></div>
      
      <p>NeetCode is a platform designed to help developers master coding interviews and improve their problem-solving skills with:</p>
      
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
      <p>&copy; ${new Date().getFullYear()} NeetCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Email template for group join notification
const groupJoinEmailTemplate = ({ name, groupName, groupDescription }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Joined a New Group on NeetCode</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { padding: 30px; background-color: #f9fafb; border-radius: 0 0 5px 5px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; margin: 20px 0; font-weight: bold; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25); }
    .button:hover { background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%); }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .group-card { background-color: white; border-radius: 8px; padding: 15px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
    .group-name { font-size: 18px; font-weight: bold; color: #4f46e5; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You've Joined a New Group!</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>You've successfully joined the group <strong>${groupName}</strong> on NeetCode!</p>
      
      <div class="group-card">
        <div class="group-name">${groupName}</div>
        <p>${groupDescription || "Join your fellow developers to collaborate on coding challenges and improve your skills together."}</p>
      </div>
      
      <p>Now that you're a member, you can:</p>
      <ul>
        <li>Participate in group challenges</li>
        <li>Collaborate with other members</li>
        <li>Track your progress on the group leaderboard</li>
        <li>Share solutions and discuss problems</li>
      </ul>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/groups" class="button">Go to My Groups</a>
      </p>
      
      <p>Happy coding!</p>
      <p>The NeetCode Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NeetCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Email template for challenge join notification
const challengeJoinEmailTemplate = ({ name, challengeName, groupName, startTime, endTime }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Joined a New Challenge on NeetCode</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { padding: 30px; background-color: #f9fafb; border-radius: 0 0 5px 5px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; margin: 20px 0; font-weight: bold; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25); }
    .button:hover { background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%); }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .challenge-card { background-color: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
    .challenge-name { font-size: 20px; font-weight: bold; color: #4f46e5; margin-bottom: 10px; }
    .challenge-info { font-size: 14px; color: #6b7280; margin-bottom: 5px; }
    .quote { font-style: italic; border-left: 3px solid #4f46e5; padding-left: 15px; margin: 20px 0; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You've Joined a New Challenge!</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>You've signed up for the <strong>${challengeName}</strong> challenge in the ${groupName} group!</p>
      
      <div class="challenge-card">
        <div class="challenge-name">${challengeName}</div>
        <div class="challenge-info"><strong>Group:</strong> ${groupName}</div>
        <div class="challenge-info"><strong>Start Time:</strong> ${new Date(startTime).toLocaleString()}</div>
        <div class="challenge-info"><strong>End Time:</strong> ${new Date(endTime).toLocaleString()}</div>
      </div>
      
      <div class="quote">
        "The only way to learn a new programming language is by writing programs in it." - Dennis Ritchie
      </div>
      
      <p>Get ready to showcase your skills, solve challenging problems, and learn from your peers. Remember, consistent practice is the key to mastery!</p>
      
      <p>Tips for success:</p>
      <ul>
        <li>Review the related topics before the challenge starts</li>
        <li>Practice solving similar problems</li>
        <li>Manage your time effectively during the challenge</li>
        <li>Don't get stuck on a single problem for too long</li>
      </ul>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/groups" class="button">Go to My Groups</a>
      </p>
      
      <p>Good luck and happy coding!</p>
      <p>The NeetCode Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NeetCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Email template for challenge results notification
const challengeResultsEmailTemplate = ({ name, challengeName, groupName, rank, score, totalParticipants }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Challenge Results on NeetCode</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { padding: 30px; background-color: #f9fafb; border-radius: 0 0 5px 5px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; margin: 20px 0; font-weight: bold; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25); }
    .button:hover { background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%); }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .results-card { background-color: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
    .challenge-name { font-size: 20px; font-weight: bold; color: #4f46e5; margin-bottom: 10px; }
    .results-info { font-size: 16px; margin: 10px 0; }
    .highlight { font-weight: bold; color: #4f46e5; }
    .quote { font-style: italic; border-left: 3px solid #4f46e5; padding-left: 15px; margin: 20px 0; color: #4b5563; }
    .score-bar { background-color: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden; margin: 15px 0; }
    .score-fill { background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%); height: 100%; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Challenge Results</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>The <strong>${challengeName}</strong> challenge in the ${groupName} group has concluded, and your results are in!</p>
      
      <div class="results-card">
        <div class="challenge-name">${challengeName}</div>
        
        <div class="results-info">Your Score: <span class="highlight">${score} points</span></div>
        
        <div class="score-bar">
          <div class="score-fill" style="width: ${Math.min(100, (score / 100) * 100)}%;"></div>
        </div>
        
        <div class="results-info">Your Rank: <span class="highlight">${rank} out of ${totalParticipants}</span></div>
        
        ${rank <= 3 ? `<div class="results-info highlight">Congratulations on your outstanding performance! 🏆</div>` : ''}
        ${rank > 3 && rank <= Math.ceil(totalParticipants * 0.25) ? `<div class="results-info highlight">Great job! You finished in the top 25%! 🌟</div>` : ''}
      </div>
      
      <div class="quote">
        "Success is not final, failure is not fatal: It is the courage to continue that counts." - Winston Churchill
      </div>
      
      <p>Keep practicing and challenging yourself to improve your problem-solving skills. Remember that consistent effort leads to growth!</p>
      
      <p>What's next?</p>
      <ul>
        <li>Review the challenge solutions and learn from other approaches</li>
        <li>Join another challenge to continue improving</li>
        <li>Practice more problems on topics you found challenging</li>
        <li>Share your insights with your group members</li>
      </ul>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/groups" class="button">View Challenge Results</a>
      </p>
      
      <p>Keep coding and growing!</p>
      <p>The NeetCode Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NeetCode. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Send verification email
export async function sendVerificationEmail({ to, name, verificationLink }) {
  const mailOptions = {
    from: `"NeetCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify Your Email Address',
    html: verificationEmailTemplate({ name, verificationLink }),
  };

  try {
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
    from: `"NeetCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset Your Password',
    html: passwordResetEmailTemplate({ name, resetLink }),
  };

  try {
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
    from: `"NeetCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to NeetCode!',
    html: welcomeEmailTemplate({ name }),
  };

  try {
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
    from: `"NeetCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'You\'ve Been Invited to NeetCode',
    html: invitationEmailTemplate({ inviterName, invitationLink, role }),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { success: false, error };
  }
}

// Send group join notification email
export async function sendGroupJoinEmail({ to, name, groupName, groupDescription }) {
  const mailOptions = {
    from: `"NeetCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: `You've Joined the ${groupName} Group on NeetCode`,
    html: groupJoinEmailTemplate({ name, groupName, groupDescription }),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Group join email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group join email:', error);
    return { success: false, error };
  }
}

// Send challenge join notification email
export async function sendChallengeJoinEmail({ to, name, challengeName, groupName, startTime, endTime }) {
  const mailOptions = {
    from: `"NeetCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: `You've Joined the ${challengeName} Challenge on NeetCode`,
    html: challengeJoinEmailTemplate({ name, challengeName, groupName, startTime, endTime }),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Challenge join email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending challenge join email:', error);
    return { success: false, error };
  }
}

// Send challenge results notification email
export async function sendChallengeResultsEmail({ to, name, challengeName, groupName, rank, score, totalParticipants }) {
  const mailOptions = {
    from: `"NeetCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your Results for the ${challengeName} Challenge on NeetCode`,
    html: challengeResultsEmailTemplate({ name, challengeName, groupName, rank, score, totalParticipants }),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Challenge results email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending challenge results email:', error);
    return { success: false, error };
  }
} 