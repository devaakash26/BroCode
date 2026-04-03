'use client';

import { AlertTriangle, Code2, LayoutPanelLeft, Keyboard, X, Check } from 'lucide-react';

const FEATURES = [
  { icon: Code2,           label: 'Full code editor with syntax highlighting' },
  { icon: LayoutPanelLeft, label: 'Multi-panel problem & solution view' },
  { icon: Keyboard,        label: 'Keyboard shortcuts & productivity tools' },
];

export default function MobileRestriction({
  action = "challenge",
  title = "Desktop Required",
  message = "This feature requires a desktop browser for the full experience.",
}) {
  return (
    <>
      <style>{`
        @keyframes phone-shake {
          0%, 55%, 100% { transform: rotate(0deg) translateY(0); }
          10%  { transform: rotate(-12deg) translateY(-2px); }
          20%  { transform: rotate(10deg) translateY(2px); }
          30%  { transform: rotate(-8deg) translateY(-1px); }
          40%  { transform: rotate(5deg) translateY(1px); }
          50%  { transform: rotate(-2deg) translateY(0); }
        }
        @keyframes desktop-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(16,185,129,0.4)); }
          50%       { filter: drop-shadow(0 0 12px rgba(16,185,129,0.7)); }
        }
        @keyframes badge-pop {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.25); }
        }
        @keyframes dot-flow {
          0%   { opacity: 0.2; transform: translateX(0); }
          50%  { opacity: 1;   transform: translateX(2px); }
          100% { opacity: 0.2; transform: translateX(0); }
        }
        .phone-shake  { animation: phone-shake  2.4s ease-in-out infinite; }
        .desktop-float{ animation: desktop-float 2s ease-in-out infinite; }
        .glow-pulse   { animation: glow-pulse   2s ease-in-out infinite; }
        .badge-pop    { animation: badge-pop    1.6s ease-in-out infinite; }
      `}</style>

      {/* Page background with blurred orbs */}
      <div className="fixed inset-0 bg-gray-950 -z-10">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-indigo-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/4 rounded-full blur-3xl" />
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-xs">

          {/* Warning strip */}
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/50 rounded-t-xl px-4 py-2 backdrop-blur-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 animate-pulse" strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
              Mobile Not Supported
            </span>
          </div>

          {/* Glass card */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 border-t-0 rounded-b-xl overflow-hidden">
            <div className="px-5 pt-4 pb-4 space-y-4">

              {/* Title */}
              <div>
                <h2 className="text-sm font-bold text-white">{title}</h2>
                <p className="mt-0.5 text-[11px] text-gray-400 leading-relaxed">{message}</p>
              </div>

              {/* Animated device comparison */}
              <div className="flex items-center justify-center gap-5 bg-gray-800/40 rounded-xl py-5 border border-gray-700/30">

                {/* Phone — shaking */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative phone-shake">
                    <svg width="34" height="56" viewBox="0 0 34 56" fill="none">
                      <rect x="1" y="1" width="32" height="54" rx="5" stroke="#4B5563" strokeWidth="1.5" fill="#111827"/>
                      <rect x="11" y="3.5" width="12" height="1.5" rx="0.75" fill="#374151"/>
                      <rect x="3.5" y="8" width="27" height="37" rx="1" fill="#0D1117"/>
                      {/* diagonal bars on screen */}
                      <line x1="7" y1="12" x2="20" y2="25" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
                      <line x1="14" y1="9" x2="27" y2="22" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round"/>
                      <circle cx="17" cy="50" r="2" fill="#1F2937"/>
                    </svg>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center badge-pop shadow-lg shadow-red-500/40">
                      <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">Mobile</span>
                </div>

                {/* Animated dots flow */}
                <div className="flex gap-1 items-center">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full bg-gray-600"
                      style={{ animation: `dot-flow 1s ease-in-out ${delay}s infinite` }}
                    />
                  ))}
                </div>

                {/* Desktop — floating + glowing */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative desktop-float">
                    <div className="glow-pulse">
                      <svg width="58" height="46" viewBox="0 0 58 46" fill="none">
                        <rect x="1" y="1" width="56" height="36" rx="4" stroke="#10B981" strokeWidth="1.5" fill="#111827"/>
                        <rect x="4" y="4" width="50" height="30" rx="1" fill="#0D1117"/>
                        {/* code lines on screen */}
                        <rect x="9"  y="11" width="16" height="1.5" rx="0.75" fill="#059669" opacity="0.8"/>
                        <rect x="9"  y="15" width="28" height="1.5" rx="0.75" fill="#1F2937"/>
                        <rect x="9"  y="19" width="22" height="1.5" rx="0.75" fill="#1F2937"/>
                        <rect x="9"  y="23" width="26" height="1.5" rx="0.75" fill="#1F2937"/>
                        {/* stand */}
                        <rect x="23" y="37" width="12" height="4" rx="0" fill="#111827" stroke="#10B981" strokeWidth="1"/>
                        <rect x="17" y="41" width="24" height="3" rx="1.5" fill="#111827" stroke="#10B981" strokeWidth="1"/>
                      </svg>
                    </div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center badge-pop shadow-lg shadow-emerald-500/50">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">Desktop</span>
                </div>
              </div>

              {/* Feature list */}
              <div className="space-y-1.5">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-800/80 border border-gray-700/60 flex items-center justify-center">
                      <Icon className="h-2.5 w-2.5 text-gray-400" strokeWidth={1.75} />
                    </div>
                    <span className="text-[11px] text-gray-400">{label}</span>
                  </div>
                ))}
              </div>

              {/* Tip */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">
                <span className="text-[10px] text-blue-300/80 leading-relaxed">
                  <span className="font-semibold text-blue-300">Tip:</span> You can browse &amp; view {action}s on mobile.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-gray-800/50 flex justify-between items-center">
              <button
                onClick={() => window.history.back()}
                className="text-[11px] text-gray-500 hover:text-white transition-colors font-medium"
              >
                ← Go Back
              </button>
              <span className="text-[10px] text-gray-700 font-mono">desktop only</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
