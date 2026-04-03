'use client';

import { useState, useEffect } from 'react';

const DISMISS_KEY = 'maintenance-banner-dismissed';

function formatScheduledTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata', hour12: true,
  }) + ' IST';
}

function useCountdownShort(startTime) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!startTime) return;
    const tick = () => {
      const diff = new Date(startTime) - new Date();
      if (diff <= 0) { setLabel('soon'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 24) { setLabel(`in ${Math.floor(h / 24)}d ${h % 24}h`); }
      else if (h > 0) { setLabel(`in ${h}h ${m}m`); }
      else { setLabel(`in ${m}m`); }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [startTime]);
  return label;
}

export default function MaintenanceBanner() {
  const [scheduled, setScheduled] = useState(null);
  const [dismissed, setDismissed] = useState(true); // start dismissed to avoid flash

  useEffect(() => {
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);

    const check = () => {
      fetch('/api/maintenance', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          if (!data.scheduledPending || !data.scheduled) {
            // Maintenance is no longer pending (started, ended, or cancelled) — hide banner
            setScheduled(null);
            setDismissed(true);
            return;
          }
          // If user already dismissed this specific window, keep hidden
          if (dismissedUntil === data.scheduled.startTime) return;
          setScheduled(data.scheduled);
          setDismissed(false);
        })
        .catch(() => {});
    };

    check(); // immediate on mount
    const id = setInterval(check, 10000); // re-check every 10 s
    return () => clearInterval(id);
  }, []);

  const handleDismiss = () => {
    if (scheduled?.startTime) {
      localStorage.setItem(DISMISS_KEY, scheduled.startTime);
    }
    setDismissed(true);
    // Track dismissal server-side (best-effort, non-blocking)
    fetch('/api/maintenance/dismiss', { method: 'POST' }).catch(() => {});
  };

  const countdown = useCountdownShort(scheduled?.startTime);

  if (dismissed || !scheduled) return null;

  return (
    <div className="relative z-50 w-full bg-amber-500/10 border-b border-amber-500/25 text-amber-200">
      <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center gap-3">
        {/* Pulsing dot */}
        <span className="relative flex-shrink-0 h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>

        <p className="flex-1 text-sm text-center leading-tight">
          <span className="font-semibold text-amber-300">Scheduled maintenance</span>
          {' — '}
          BroCode will be offline on{' '}
          <span className="font-medium">{formatScheduledTime(scheduled.startTime)}</span>
          {scheduled.endTime && (
            <> until <span className="font-medium">{formatScheduledTime(scheduled.endTime)}</span></>
          )}
          {countdown && <span className="ml-1 text-amber-400 font-semibold">({countdown})</span>}
          {scheduled.reason && <span className="ml-2 text-amber-200/60 text-xs">· {scheduled.reason}</span>}
        </p>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss maintenance banner"
          className="flex-shrink-0 hover:bg-amber-500/20 rounded-md p-1 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
