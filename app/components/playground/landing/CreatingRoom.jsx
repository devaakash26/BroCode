'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Code2, PenTool, Mic, KeyRound } from 'lucide-react';

/*
 * Full-screen "Making your playground" sequence shown after Create.
 * Step 0 waits for the server to hand back a room id; the rest play on a short
 * timer while the room page is prefetched, then onDone() navigates.
 */

const STEPS = [
  { icon: KeyRound, label: 'Reserving your room', ms: 650 },
  { icon: Code2, label: 'Setting up the editor', detail: 'C · C++ · Java · JavaScript · Python', ms: 750 },
  { icon: PenTool, label: 'Laying out the scratchpad', ms: 650 },
  { icon: Mic, label: 'Opening voice and chat', ms: 600 },
];
const HOLD_READY_MS = 450;

function StepIcon({ state, Icon }) {
  return (
    <span className="relative w-7 h-7 flex-shrink-0 flex items-center justify-center">
      {state === 'active' && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-indigo-400/30 border-t-indigo-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        {state === 'done' ? (
          <motion.span
            key="done"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </motion.span>
        ) : (
          <motion.span key="icon" exit={{ scale: 0.6, opacity: 0 }} className={state === 'active' ? 'text-indigo-300' : 'text-slate-600'}>
            <Icon className="w-3.5 h-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** The room assembling itself: frame, then editor, scratchpad and people. */
function Assembly({ step, roomId }) {
  const code = [62, 48, 74, 40, 66, 30, 52];
  return (
    <div className="relative w-full aspect-[16/10] select-none" aria-hidden>
      <svg viewBox="0 0 400 250" className="absolute inset-0 w-full h-full overflow-visible">
        <motion.rect
          x="1" y="1" width="398" height="248" rx="14"
          fill="rgba(13,17,25,0.9)"
          stroke="rgba(148,163,184,0.35)"
          strokeWidth="1.2"
          initial={{ pathLength: 0, fillOpacity: 0 }}
          animate={{ pathLength: 1, fillOpacity: 1 }}
          transition={{ pathLength: { duration: 0.9, ease: 'easeInOut' }, fillOpacity: { delay: 0.6, duration: 0.4 } }}
        />
        <motion.line x1="1" y1="30" x2="399" y2="30" stroke="rgba(148,163,184,0.2)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.5 }} />
      </svg>

      {/* title bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute left-[3%] right-[3%] top-[3.2%] h-[7%] flex items-center gap-1.5"
      >
        {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/15" />)}
        <span className="ml-2 h-1.5 w-16 rounded bg-white/15" />
        <AnimatePresence>
          {roomId && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-auto inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-red-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* panes */}
      <div className="absolute left-[2.5%] right-[2.5%] top-[15%] bottom-[5%] grid grid-cols-[2fr_3fr] gap-[1.5%]">
        <div className="relative rounded-md overflow-hidden">
          <AnimatePresence>
            {step >= 2 && (
              <motion.div
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="absolute inset-0 rounded-md border border-white/[0.08] bg-[#0b1020]"
                style={{ backgroundImage: 'radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px)', backgroundSize: '10px 10px' }}
              >
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                  <motion.path
                    d="M12 82 h16 v-14 h16 v-14 h16 v-14 h16 v-14"
                    fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.15 }}
                  />
                </svg>
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute left-[10%] top-[10%] h-2 w-[45%] rounded bg-white/70"
                />
              </motion.div>
            )}
          </AnimatePresence>
          {step < 2 && <div className="absolute inset-0 rounded-md border border-dashed border-white/[0.08]" />}
        </div>
        <div className="relative rounded-md overflow-hidden">
          <AnimatePresence>
            {step >= 1 && (
              <motion.div
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="absolute inset-0 rounded-md border border-white/[0.08] bg-[#0b1020] p-[5%] flex flex-col gap-[6%]"
              >
                {code.map((w, i) => (
                  <motion.span
                    key={i}
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ delay: 0.1 + i * 0.07, duration: 0.35, ease: 'easeOut' }}
                    className="h-[6%] min-h-[3px] rounded-sm"
                    style={{ background: ['#c084fc', '#e5e7eb', '#93c5fd', '#e5e7eb', '#fbbf24', '#e5e7eb', '#c084fc'][i], opacity: 0.75, marginLeft: i > 0 && i < 6 ? `${(i % 3) * 6}%` : 0 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {step < 1 && <div className="absolute inset-0 rounded-md border border-dashed border-white/[0.08]" />}
        </div>
      </div>

      {/* people */}
      <AnimatePresence>
        {step >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-[5%] bottom-[9%] flex items-center gap-2 rounded-full bg-black/60 ring-1 ring-white/10 pl-1 pr-2.5 py-1"
          >
            <span className="flex -space-x-1.5">
              {['#6366f1', '#ec4899', '#10b981'].map((c, i) => (
                <motion.span
                  key={c}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 500, damping: 20 }}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full ring-2 ring-black/60"
                  style={{ background: c }}
                />
              ))}
            </span>
            <span className="flex items-end gap-[2px] h-3">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-[2px] rounded-full bg-emerald-400"
                  animate={{ height: [3, 10, 4, 8, 3] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CreatingRoom({ open, title, roomId, onDone }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0); // index of the active step; STEPS.length = ready
  const doneRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setStep(0);
      doneRef.current = false;
    }
  }, [open]);

  // Advance through the steps. Step 0 can't finish until the room exists.
  useEffect(() => {
    if (!open) return undefined;
    if (step === 0 && !roomId) return undefined;
    if (step >= STEPS.length) {
      const t = setTimeout(() => {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }, reduce ? 0 : HOLD_READY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), reduce ? 120 : STEPS[step].ms);
    return () => clearTimeout(t);
  }, [open, step, roomId, onDone, reduce]);

  const ready = step >= STEPS.length;
  const progress = Math.min(1, (step + (ready ? 0 : 0.5)) / STEPS.length);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="creating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[90] overflow-y-auto bg-[#06080d] text-white"
          role="status"
          aria-live="polite"
          aria-label={ready ? 'Playground ready' : 'Making your playground'}
        >
          {/* backdrop */}
          <div
            className="pointer-events-none fixed inset-0 opacity-70 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_40%,black,transparent)]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          <motion.div
            className="pointer-events-none fixed left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 w-[760px] h-[440px] rounded-full bg-indigo-600/25 blur-[120px]"
            animate={reduce ? undefined : { opacity: [0.6, 1, 0.6], scale: [0.96, 1.04, 0.96] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative min-h-full flex items-center justify-center px-5 py-12">
            <div className="w-full max-w-[460px]">
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <Assembly step={step} roomId={roomId} />
                <AnimatePresence>
                  {ready && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="w-14 h-14 rounded-full bg-emerald-500 shadow-[0_0_0_8px_rgba(16,185,129,0.15),0_20px_50px_-10px_rgba(16,185,129,0.6)] flex items-center justify-center">
                        <Check className="w-7 h-7 text-white" strokeWidth={3} />
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <div className="mt-9 text-center">
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={ready ? 'ready' : 'making'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-2xl sm:text-[28px] font-semibold tracking-[-0.03em]"
                  >
                    {ready ? 'Your playground is ready' : 'Making your playground'}
                  </motion.h2>
                </AnimatePresence>
                <p className="mt-2 text-sm text-slate-400 truncate">{title}</p>
                <div className="mt-3 h-7 flex justify-center">
                  {roomId ? (
                    <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-white/[0.05] ring-1 ring-white/10 text-xs">
                      <span className="text-slate-500">Room</span>
                      <span className="font-mono font-semibold tracking-wider text-indigo-300">
                        {roomId.split('').map((ch, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ delay: i * 0.035, duration: 0.25 }}
                            className="inline-block"
                          >
                            {ch}
                          </motion.span>
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06]">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-2.5 rounded-sm bg-white/20"
                          animate={{ opacity: [0.2, 0.8, 0.2] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.08 }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>

              {/* progress */}
              <div className="mt-7 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                  initial={{ width: '4%' }}
                  animate={{ width: `${Math.max(4, progress * 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>

              <ul className="mt-5 space-y-1">
                {STEPS.map((s, i) => {
                  const state = i < step ? 'done' : i === step ? 'active' : 'pending';
                  return (
                    <motion.li
                      key={s.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: state === 'pending' ? 0.45 : 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      className="flex items-center gap-3 h-10 px-2 rounded-lg"
                    >
                      <StepIcon state={state} Icon={s.icon} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${state === 'active' ? 'text-white font-medium' : 'text-slate-300'}`}>{s.label}</span>
                        {s.detail && state !== 'pending' && <span className="block text-[11px] text-slate-500 truncate">{s.detail}</span>}
                      </span>
                      {state === 'done' && <span className="text-[11px] text-emerald-400/80">Done</span>}
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
