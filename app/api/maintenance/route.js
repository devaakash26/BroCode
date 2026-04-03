import { NextResponse } from 'next/server';
import {
  getMaintenanceConfig,
  addSubscriber,
  isMaintenanceActive,
  isScheduledMaintenancePending,
  getActiveMaintenance,
} from '@/app/lib/maintenance';

// Public: check maintenance status
export async function GET() {
  try {
    const config = await getMaintenanceConfig();
    const active = isMaintenanceActive(config);
    const scheduledPending = isScheduledMaintenancePending(config);
    const activeMaintenance = getActiveMaintenance(config);

    return NextResponse.json({
      success: true,
      active,
      scheduledPending,
      maintenance: activeMaintenance,
      scheduled: scheduledPending ? config.scheduled : null,
    });
  } catch (e) {
    console.error('Error checking maintenance status:', e);
    return NextResponse.json({ success: true, active: false, scheduledPending: false });
  }
}

// Public: subscribe email for notification when maintenance ends
export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body?.email || '').toString().trim().toLowerCase();

    if (!email || !email.includes('@') || !email.includes('.') || email.length > 320) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address' }, { status: 400 });
    }

    await addSubscriber(email);

    return NextResponse.json({ success: true, message: "We'll notify you when maintenance is over!" });
  } catch (e) {
    console.error('Error subscribing to maintenance notifications:', e);
    return NextResponse.json({ success: false, error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}
