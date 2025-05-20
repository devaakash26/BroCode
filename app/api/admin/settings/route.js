import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma, disconnectPrisma } from '@/app/lib/db';

// Default settings if none exist in the database
const defaultSettings = {
  general: {
    siteName: 'NeetCode',
    siteDescription: 'Platform for learning algorithms and data structures',
    logoUrl: '/images/logo.svg',
    allowRegistration: true,
    requireEmailVerification: true,
    maintenanceMode: false,
  },
  security: {
    sessionLength: 24, // hours
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireStrongPasswords: true,
    enableTwoFactorAuth: false,
  },
  email: {
    senderName: 'NeetCode Team',
    senderEmail: 'noreply@neetcode.io',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    smtpPassword: '',
  },
  social: {
    enableDiscord: false,
    discordWebhook: '',
    enableGithub: true,
    githubClientId: '',
    githubClientSecret: '',
  },
  problems: {
    defaultTimeLimit: 60, // seconds
    enableAutomaticSubmissionRejection: true,
    submissionCooldown: 5, // seconds
    showProblemsBeforeLogin: true,
    allowProblemComments: true,
  }
};

// GET handler for fetching platform settings
export async function GET(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Try to fetch settings from database
    let settings = defaultSettings;
    
    try {
      const settingsRecord = await prisma.setting.findFirst({
        where: { key: 'platform_settings' }
      });
      
      if (settingsRecord && settingsRecord.value) {
        settings = JSON.parse(settingsRecord.value);
      }
    } catch (error) {
      console.error('Error fetching settings from database:', error);
      // If there's an error, we'll just use the default settings
    }

    return NextResponse.json({ 
      success: true, 
      settings 
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch settings' 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
}

// POST handler for updating platform settings
export async function POST(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await request.json();
    
    // Validate settings (simplified for example)
    if (!settings || !settings.general) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid settings format' 
      }, { status: 400 });
    }

    // Update the settings in the database
    try {
      await prisma.setting.upsert({
        where: { key: 'platform_settings' },
        update: { value: JSON.stringify(settings) },
        create: { key: 'platform_settings', value: JSON.stringify(settings) },
      });
    } catch (error) {
      console.error('Error updating settings in database:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while updating settings' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update settings' 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 