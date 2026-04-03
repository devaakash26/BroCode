import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSubscribers, clearSubscribers } from '@/app/lib/maintenance';
import { sendMaintenanceCompleteEmail } from '@/app/lib/email';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const subscribers = await getSubscribers();

    if (subscribers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, total: 0 });
    }

    const results = await Promise.allSettled(
      subscribers.map((s) => sendMaintenanceCompleteEmail({ to: s.email }))
    );

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value?.success).length;
    const failed = results.length - sent;

    await clearSubscribers();

    return NextResponse.json({ success: true, sent, failed, total: subscribers.length });
  } catch (e) {
    console.error('Error sending maintenance notifications:', e);
    return NextResponse.json({ success: false, error: 'Failed to send notifications' }, { status: 500 });
  }
}
