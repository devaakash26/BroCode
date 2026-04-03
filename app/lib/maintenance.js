import { prisma } from '@/app/lib/db';

export const DEFAULT_MAINTENANCE_CONFIG = {
  emergency: {
    active: false,
    startTime: null,
    endTime: null,
    reason: '',
    notifyOnComplete: true,
  },
  scheduled: {
    active: false,
    startTime: null,
    endTime: null,
    reason: '',
  },
};

export async function getMaintenanceConfig() {
  try {
    const record = await prisma.setting.findUnique({
      where: { key: 'maintenance_config' },
    });
    if (record?.value) {
      const parsed = JSON.parse(record.value);
      return {
        emergency: { ...DEFAULT_MAINTENANCE_CONFIG.emergency, ...parsed.emergency },
        scheduled: { ...DEFAULT_MAINTENANCE_CONFIG.scheduled, ...parsed.scheduled },
      };
    }
  } catch (e) {
    console.error('Error reading maintenance config:', e);
  }
  return DEFAULT_MAINTENANCE_CONFIG;
}

export async function saveMaintenanceConfig(config) {
  await prisma.setting.upsert({
    where: { key: 'maintenance_config' },
    update: { value: JSON.stringify(config) },
    create: { key: 'maintenance_config', value: JSON.stringify(config) },
  });
}

export async function getSubscribers() {
  try {
    const record = await prisma.setting.findUnique({
      where: { key: 'maintenance_subscribers' },
    });
    if (record?.value) {
      return JSON.parse(record.value);
    }
  } catch (e) {
    console.error('Error reading maintenance subscribers:', e);
  }
  return [];
}

export async function addSubscriber(email) {
  const current = await getSubscribers();
  if (current.some((s) => s.email === email)) return;
  current.push({ email, subscribedAt: new Date().toISOString() });
  await prisma.setting.upsert({
    where: { key: 'maintenance_subscribers' },
    update: { value: JSON.stringify(current) },
    create: { key: 'maintenance_subscribers', value: JSON.stringify(current) },
  });
}

export async function clearSubscribers() {
  await prisma.setting.upsert({
    where: { key: 'maintenance_subscribers' },
    update: { value: JSON.stringify([]) },
    create: { key: 'maintenance_subscribers', value: JSON.stringify([]) },
  });
}

// Check if maintenance is currently active (either emergency or scheduled past its start time)
export function isMaintenanceActive(config) {
  if (!config) return false;
  if (config.emergency?.active) return true;
  if (config.scheduled?.active) {
    const startTime = config.scheduled.startTime ? new Date(config.scheduled.startTime) : null;
    const endTime = config.scheduled.endTime ? new Date(config.scheduled.endTime) : null;
    const now = new Date();
    if (startTime && startTime <= now) {
      if (!endTime || endTime > now) return true;
    }
  }
  return false;
}

// Check if a scheduled maintenance banner should be shown (scheduled but not yet started)
export function isScheduledMaintenancePending(config) {
  if (!config?.scheduled?.active) return false;
  const startTime = config.scheduled.startTime ? new Date(config.scheduled.startTime) : null;
  if (!startTime) return false;
  return startTime > new Date();
}

// Get the active maintenance object (either emergency or auto-started scheduled)
export function getActiveMaintenance(config) {
  if (!config) return null;
  if (config.emergency?.active) return { type: 'emergency', ...config.emergency };
  if (config.scheduled?.active) {
    const startTime = config.scheduled.startTime ? new Date(config.scheduled.startTime) : null;
    const endTime = config.scheduled.endTime ? new Date(config.scheduled.endTime) : null;
    const now = new Date();
    if (startTime && startTime <= now && (!endTime || endTime > now)) {
      return { type: 'scheduled', ...config.scheduled };
    }
  }
  return null;
}
