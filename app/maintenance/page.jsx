'use client';

import { useState, useEffect } from 'react';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata', hour12: true,
  }) + ' IST';
}

function useCountdown(endTime) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!endTime) return;
    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setRemaining(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return remaining;
}

export default function MaintenancePage({ maintenance }) {
  const [email, setEmail] = useState('');
  const [subState, setSubState] = useState('idle'); // idle | loading | success | error
  const [subMessage, setSubMessage] = useState('');
  const countdown = useCountdown(maintenance?.endTime);

  // Poll every 5 seconds — when maintenance ends, redirect users back to home
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        const data = await res.json();
        if (!data.active) {
          window.location.href = '/';
        }
      } catch {
        // Network hiccup — stay on page and try again next tick
      }
    };
    // Don't check immediately (we know it's active — we were rendered here)
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubState('loading');
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSubState('success');
        setSubMessage(data.message || "You're on the list!");
      } else {
        setSubState('error');
        setSubMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setSubState('error');
      setSubMessage('Network error. Please try again.');
    }
  };

  return (
    <>
      <style>{`
        @keyframes gear-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes gear-spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.15; }
          50% { transform: translateY(-30px) scale(1.08); opacity: 0.22; }
        }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .gear-a { animation: gear-spin 8s linear infinite; }
        .gear-b { animation: gear-spin-rev 6s linear infinite; }
        .orb { animation: orb-float 6s ease-in-out infinite; }
        .orb-2 { animation: orb-float 8s ease-in-out infinite 2s; }
        .orb-3 { animation: orb-float 7s ease-in-out infinite 4s; }
        .fade-up { animation: fade-up 0.6s ease forwards; }
        .fade-up-1 { animation: fade-up 0.6s ease 0.1s both; }
        .fade-up-2 { animation: fade-up 0.6s ease 0.25s both; }
        .fade-up-3 { animation: fade-up 0.6s ease 0.4s both; }
        .fade-up-4 { animation: fade-up 0.6s ease 0.55s both; }
        .pulse-ring { animation: pulse-ring 2s ease-out infinite; }
      `}</style>

      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#080b11]">

        {/* Blurred orbs */}
        <div className="orb pointer-events-none absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-orange-600 blur-[140px]" />
        <div className="orb-2 pointer-events-none absolute bottom-[-15%] right-[-8%] w-[450px] h-[450px] rounded-full bg-purple-700 blur-[150px]" />
        <div className="orb-3 pointer-events-none absolute top-[40%] left-[55%] w-[300px] h-[300px] rounded-full bg-blue-800 blur-[120px]" />

        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />

        {/* Main card */}
        <div className="relative z-10 w-full max-w-lg px-6">
          {/* Logo */}
          <div className="fade-up mb-10 text-center">
            <span className="font-mono text-lg font-bold tracking-widest text-white/80">
              BRO<span className="text-orange-400">.</span>CODE
            </span>
          </div>

          {/* Gear icon cluster */}
          <div className="fade-up-1 relative flex justify-center mb-8">
            {/* Pulse ring */}
            <div className="pulse-ring absolute inset-0 m-auto w-20 h-20 rounded-full border border-orange-500/40" />
            <div className="relative w-20 h-20">
              {/* Large gear */}
              <svg className="gear-a absolute inset-0 w-full h-full text-orange-500/70" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.73-.07-1.08l2.32-1.84c.21-.16.26-.44.13-.67l-2.2-3.84c-.13-.23-.42-.31-.65-.23l-2.73 1.1c-.57-.44-1.18-.8-1.86-1.07l-.42-2.9C14.19 2.11 13.96 2 13.72 2h-4.4c-.24 0-.47.11-.5.34l-.42 2.9c-.68.27-1.29.63-1.86 1.07L3.82 5.22c-.23-.08-.52 0-.65.23L.97 9.29c-.13.23-.08.51.13.67L3.42 11.8c-.04.35-.07.7-.07 1.08s.03.73.07 1.08L1.1 15.8c-.21.16-.26.44-.13.67l2.2 3.84c.13.23.42.31.65.23l2.73-1.1c.57.44 1.18.8 1.86 1.07l.42 2.9c.03.23.26.34.5.34h4.4c.24 0 .47-.11.5-.34l.42-2.9c.68-.27 1.29-.63 1.86-1.07l2.73 1.1c.23.08.52 0 .65-.23l2.2-3.84c.13-.23.08-.51-.13-.67l-2.32-1.82z"/>
              </svg>
              {/* Small gear overlay */}
              <svg className="gear-b absolute bottom-0 right-0 w-9 h-9 text-purple-400/60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.73-.07-1.08l2.32-1.84c.21-.16.26-.44.13-.67l-2.2-3.84c-.13-.23-.42-.31-.65-.23l-2.73 1.1c-.57-.44-1.18-.8-1.86-1.07l-.42-2.9C14.19 2.11 13.96 2 13.72 2h-4.4c-.24 0-.47.11-.5.34l-.42 2.9c-.68.27-1.29.63-1.86 1.07L3.82 5.22c-.23-.08-.52 0-.65.23L.97 9.29c-.13.23-.08.51.13.67L3.42 11.8c-.04.35-.07.7-.07 1.08s.03.73.07 1.08L1.1 15.8c-.21.16-.26.44-.13.67l2.2 3.84c.13.23.42.31.65.23l2.73-1.1c.57.44 1.18.8 1.86 1.07l.42 2.9c.03.23.26.34.5.34h4.4c.24 0 .47-.11.5-.34l.42-2.9c.68-.27 1.29-.63 1.86-1.07l2.73 1.1c.23.08.52 0 .65-.23l2.2-3.84c.13-.23.08-.51-.13-.67l-2.32-1.82z"/>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="fade-up-2 text-center mb-6">
            <p className="font-mono text-[11px] font-semibold tracking-[3px] text-orange-400/80 uppercase mb-3">
              Scheduled Maintenance
            </p>
            <h1 className="text-4xl font-bold text-white leading-tight mb-2">
              We'll be right back.
            </h1>
            <p className="text-gray-400 text-base leading-relaxed">
              BroCode is undergoing maintenance to keep things running smoothly for you.
            </p>
          </div>

          {/* Time range card */}
          {(maintenance?.startTime || maintenance?.endTime) && (
            <div className="fade-up-3 bg-white/[0.04] border border-white/10 rounded-2xl p-5 mb-5 divide-y divide-white/[0.06]">
              {maintenance?.startTime && (
                <div className="flex items-center justify-between pb-4">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Started</span>
                  <span className="text-sm font-medium text-white">{formatDate(maintenance.startTime)}</span>
                </div>
              )}
              {maintenance?.endTime && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Est. End</span>
                  <span className="text-sm font-medium text-white">{formatDate(maintenance.endTime)}</span>
                </div>
              )}
            </div>
          )}

          {/* Countdown */}
          {countdown && (
            <div className="fade-up-3 mb-5">
              <p className="text-center text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Estimated time remaining</p>
              <div className="flex justify-center gap-3">
                {[
                  { label: 'hrs', value: String(countdown.h).padStart(2, '0') },
                  { label: 'min', value: String(countdown.m).padStart(2, '0') },
                  { label: 'sec', value: String(countdown.s).padStart(2, '0') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center bg-white/[0.05] border border-white/10 rounded-xl px-5 py-3 min-w-[72px]">
                    <span className="text-2xl font-bold font-mono text-white tabular-nums">{value}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          {maintenance?.reason && (
            <div className="fade-up-3 bg-orange-500/[0.08] border border-orange-500/20 rounded-xl px-4 py-3 mb-5 flex gap-3 items-start">
              <span className="text-orange-400 mt-0.5">⚠</span>
              <p className="text-sm text-orange-200/80 leading-relaxed">{maintenance.reason}</p>
            </div>
          )}

          {/* Divider */}
          <div className="fade-up-4 flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-gray-600 font-mono">NOTIFY ME</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Subscribe form */}
          <div className="fade-up-4">
            {subState === 'success' ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 text-lg">✓</span>
                </div>
                <p className="text-green-400 font-medium text-sm">{subMessage}</p>
                <p className="text-gray-500 text-xs text-center">We'll send you an email the moment we're back online.</p>
              </div>
            ) : (
              <>
                <p className="text-center text-sm text-gray-500 mb-3">
                  Get notified by email the moment we're back online.
                </p>
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.07] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={subState === 'loading'}
                    className="px-5 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
                  >
                    {subState === 'loading' ? '...' : 'Notify me'}
                  </button>
                </form>
                {subState === 'error' && (
                  <p className="text-red-400 text-xs mt-2 text-center">{subMessage}</p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 mt-10 font-mono">
            &copy; {new Date().getFullYear()} BroCode &bull; All systems will resume shortly
          </p>
        </div>
      </div>
    </>
  );
}
