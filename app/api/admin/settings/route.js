import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, disconnectPrisma } from '@/app/lib/db';
import { z } from 'zod';

// Default settings if none exist in the database
const defaultSettings = {
  general: {
    siteName: 'BroCode',
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
    senderName: 'BroCode Team',
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

const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(1, 'Site name is required').default('BroCode'),
    siteDescription: z.string().optional(),
    logoUrl: z.string().url().optional(),
  }),
  email: z.object({
    senderName: z.string().min(1, 'Sender name is required').default('BroCode Team'),
    senderEmail: z.string().email('Invalid email address'),
    smtpHost: z.string().optional(),
  }),
  security: z.object({
    sessionLength: z.number().min(1, 'Session length must be at least 1 hour'),
    maxLoginAttempts: z.number().min(1, 'Maximum login attempts must be at least 1'),
    passwordMinLength: z.number().min(1, 'Password minimum length must be at least 1'),
    requireStrongPasswords: z.boolean(),
    enableTwoFactorAuth: z.boolean(),
  }),
  social: z.object({
    enableDiscord: z.boolean(),
    discordWebhook: z.string().url().optional(),
    enableGithub: z.boolean(),
    githubClientId: z.string().optional(),
    githubClientSecret: z.string().optional(),
  }),
  problems: z.object({
    defaultTimeLimit: z.number().min(1, 'Default time limit must be at least 1 second'),
    enableAutomaticSubmissionRejection: z.boolean(),
    submissionCooldown: z.number().min(1, 'Submission cooldown must be at least 1 second'),
    showProblemsBeforeLogin: z.boolean(),
    allowProblemComments: z.boolean(),
  }),
}); 
