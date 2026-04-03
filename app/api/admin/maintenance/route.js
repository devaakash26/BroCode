import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getMaintenanceConfig,
  saveMaintenanceConfig,
  getSubscribers,
} from '@/app/lib/maintenance';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const [config, subscribers] = await Promise.all([
      getMaintenanceConfig(),
      getSubscribers(),
    ]);

    // Auto-clear scheduled maintenance if its end time has passed
    if (
      config.scheduled?.active &&
      config.scheduled.endTime &&
      new Date(config.scheduled.endTime) <= new Date()
    ) {
      config.scheduled = { active: false, startTime: null, endTime: null, reason: '' };
      await saveMaintenanceConfig(config);
    }

    return NextResponse.json({ success: true, config, subscriberCount: subscribers.length });
  } catch (e) {
    console.error('Error fetching maintenance config:', e);
    return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { config } = body;

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid config' }, { status: 400 });
    }

    const currentConfig = await getMaintenanceConfig();
    await saveMaintenanceConfig(config);

    // If emergency maintenance just DEACTIVATED and notifyOnComplete was true → fire emails
    const wasActive = currentConfig.emergency?.active;
    const isNowActive = config.emergency?.active;
    if (wasActive && !isNowActive && currentConfig.emergency?.notifyOnComplete) {
      // Fire and forget — don't block the response
      (async () => {
        try {
          const { getSubscribers: getSubs, clearSubscribers } = await import('@/app/lib/maintenance');
          const { sendMaintenanceCompleteEmail } = await import('@/app/lib/email');
          const subs = await getSubs();
          await Promise.allSettled(subs.map((s) => sendMaintenanceCompleteEmail({ to: s.email })));
          await clearSubscribers();
        } catch (err) {
          console.error('Auto-notify on deactivate failed:', err);
        }
      })();
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error saving maintenance config:', e);
    return NextResponse.json({ success: false, error: 'Failed to save config' }, { status: 500 });
  }
}
