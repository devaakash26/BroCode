export const LANGUAGES = [
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
  { id: 'c', label: 'C', monaco: 'c' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'python', label: 'Python', monaco: 'python' },
];

export const MAX_INPUTS = 5;

const PALETTE = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16',
];

/** Stable per-user color so the same person looks the same everywhere. */
export function colorFor(userId = '') {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

export function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

export const JOIN_ERRORS = {
  not_found: 'This playground does not exist or has expired.',
  ended: 'The host has ended this playground session.',
  full: 'This playground is full — ask the host to make room.',
  not_identified: 'Still connecting your account — please retry in a moment.',
  server_error: 'Something went wrong joining this playground.',
  server_timeout: 'The live server did not respond. Make sure the socket server is running the latest code.',
};

// ── Shared visual tokens ─────────────────────────────────────────────────────
// Plain surfaces: solid background, hairline border, no blur or glow.
export const GLASS = 'bg-white dark:bg-[#11151f] border border-gray-200 dark:border-white/[0.07]';
export const PANEL = `rounded-xl overflow-hidden ${GLASS}`;
export const PANEL_HEADER =
  'flex items-center gap-2 h-11 px-3 border-b border-gray-200 dark:border-white/[0.07]';
export const ICON_BTN =
  'inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors';
