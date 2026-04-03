'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Calendar, Bell,
  Power, PowerOff,
  Send, Trash2, ChevronRight,
  RefreshCw, CheckCircle, XCircle,
  Clock, AlertTriangle,
} from 'lucide-react';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(val) { if (!val) return null; return new Date(val).toISOString(); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true }) + ' IST';
}
function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true }) + ' IST';
}

function useCountdown(endTime) {
  const [parts, setParts] = useState(null);
  useEffect(() => {
    if (!endTime) { setParts(null); return; }
    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setParts(null); return; }
      setParts({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return parts;
}

function Toast({ toast, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const c = { success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', error: 'bg-red-500/10 border-red-500/30 text-red-300', info: 'bg-blue-500/10 border-blue-500/30 text-blue-300' };
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-lg max-w-sm ${c[toast.type] || c.info}`}>
      {toast.type === 'success' && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
      {toast.type === 'error' && <XCircle className="h-4 w-4 flex-shrink-0" />}
      {toast.type === 'info' && <Clock className="h-4 w-4 flex-shrink-0" />}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={disabled ? undefined : onChange} disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${checked ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function ConfirmDialog({ open, title, description, confirmLabel, confirmClass, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">{description}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [emEndTime, setEmEndTime] = useState('');
  const [emReason, setEmReason] = useState('');
  const [emNotify, setEmNotify] = useState(true);

  const [scStart, setScStart] = useState('');
  const [scEnd, setScEnd] = useState('');
  const [scReason, setScReason] = useState('');

  const countdown = useCountdown(config?.emergency?.active ? config.emergency.endTime : null);

  const showToast = useCallback((message, type = 'info') => setToast({ message, type }), []);
  const hideToast = useCallback(() => setToast(null), []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/maintenance');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setSubscriberCount(data.subscriberCount ?? 0);
        setEmEndTime(toLocalInput(data.config.emergency?.endTime));
        setEmReason(data.config.emergency?.reason || '');
        setEmNotify(data.config.emergency?.notifyOnComplete ?? true);
        setScStart(toLocalInput(data.config.scheduled?.startTime));
        setScEnd(toLocalInput(data.config.scheduled?.endTime));
        setScReason(data.config.scheduled?.reason || '');
      }
    } catch { showToast('Failed to load config', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => {
    fetchConfig();
    // Poll every 10 s so expired scheduled windows disappear without a manual refresh
    const id = setInterval(fetchConfig, 10000);
    return () => clearInterval(id);
  }, [fetchConfig]);

  const saveConfig = async (newConfig) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      });
      const data = await res.json();
      if (data.success) { setConfig(newConfig); return true; }
      showToast(data.error || 'Save failed', 'error');
      return false;
    } catch { showToast('Network error', 'error'); return false; }
    finally { setSaving(false); }
  };

  const handleActivateEmergency = () => setConfirm({
    title: 'Activate Emergency Maintenance?',
    description: 'All users will immediately be locked out. Admins keep full access.',
    confirmLabel: 'Yes, activate now',
    confirmClass: 'bg-red-600 hover:bg-red-500 text-white',
    onConfirm: async () => {
      setConfirm(null);
      const ok = await saveConfig({ ...config, emergency: { active: true, startTime: new Date().toISOString(), endTime: fromLocalInput(emEndTime), reason: emReason, notifyOnComplete: emNotify } });
      if (ok) showToast('Emergency maintenance activated', 'success');
    },
  });

  const handleDeactivateEmergency = () => setConfirm({
    title: 'Deactivate Maintenance?',
    description: config?.emergency?.notifyOnComplete ? 'Platform goes live. Subscribers receive email automatically.' : 'Platform goes live immediately.',
    confirmLabel: 'Deactivate now',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    onConfirm: async () => {
      setConfirm(null);
      const ok = await saveConfig({ ...config, emergency: { ...config.emergency, active: false } });
      if (ok) showToast('Maintenance deactivated — platform is live', 'success');
    },
  });

  const handleSchedule = async () => {
    if (!scStart) return showToast('Please set a start date/time', 'error');
    const ok = await saveConfig({ ...config, scheduled: { active: true, startTime: fromLocalInput(scStart), endTime: fromLocalInput(scEnd) || null, reason: scReason } });
    if (ok) showToast('Maintenance scheduled — users will see the alert banner', 'success');
  };

  const handleCancelScheduled = async () => {
    const ok = await saveConfig({ ...config, scheduled: { active: false, startTime: null, endTime: null, reason: '' } });
    if (ok) { setScStart(''); setScEnd(''); setScReason(''); showToast('Scheduled maintenance cancelled', 'success'); }
  };

  const handleSendNotifications = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/maintenance/notify', { method: 'POST' });
      const data = await res.json();
      if (data.success) { setSubscriberCount(0); showToast(`Sent to ${data.sent} user${data.sent !== 1 ? 's' : ''}`, 'success'); }
      else showToast(data.error || 'Failed to send', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setSaving(false); }
  };

  const isEmergencyActive = config?.emergency?.active === true;
  const isScheduledActive = config?.scheduled?.active === true;
  const systemStatus = isEmergencyActive
    ? { label: 'Under Maintenance', color: 'text-red-400', dot: 'bg-red-500 animate-pulse', ring: 'border-red-500/30 bg-red-500/10' }
    : isScheduledActive
    ? { label: 'Maintenance Scheduled', color: 'text-amber-400', dot: 'bg-amber-500 animate-pulse', ring: 'border-amber-500/30 bg-amber-500/10' }
    : { label: 'Fully Operational', color: 'text-emerald-400', dot: 'bg-emerald-500', ring: 'border-emerald-500/30 bg-emerald-500/10' };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <RefreshCw className="h-6 w-6 text-orange-400 animate-spin" />
      <p className="text-sm text-gray-500">Loading maintenance config…</p>
    </div>
  );

  return (
    <>
      {toast && <Toast toast={toast} onClose={hideToast} />}
      <ConfirmDialog open={!!confirm} title={confirm?.title} description={confirm?.description}
        confirmLabel={confirm?.confirmLabel} confirmClass={confirm?.confirmClass}
        onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />

      <div className="space-y-6 pb-10">
        {/* Status badge */}
        <div className="flex justify-end">
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border w-fit ${systemStatus.ring}`}>
            <span className="relative flex h-2.5 w-2.5">
              {(isEmergencyActive || isScheduledActive) && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${systemStatus.dot}`} />}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${systemStatus.dot}`} />
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider font-mono ${systemStatus.color}`}>{systemStatus.label}</span>
          </div>
        </div>

        {/* Emergency */}
        <div className={`relative rounded-2xl border overflow-hidden transition-all duration-500 ${isEmergencyActive ? 'border-red-500/40 bg-red-500/[0.04]' : 'border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.02]'}`}>
          {isEmergencyActive && <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_0_50px_-10px_rgba(239,68,68,0.25)]" />}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEmergencyActive ? 'bg-red-500/20 border border-red-500/30' : 'bg-gray-100 border border-gray-200 dark:bg-white/[0.05] dark:border-white/10'}`}>
                <Zap className={`h-4 w-4 ${isEmergencyActive ? 'text-red-400' : 'text-gray-400'}`} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Emergency Maintenance</h2>
                <p className="text-xs text-gray-500">Instantly locks all users out of the platform</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider border ${isEmergencyActive ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-gray-500 border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.03]'}`}>
              {isEmergencyActive ? '● LIVE' : '○ INACTIVE'}
            </div>
          </div>
          <div className="p-6">
            {isEmergencyActive ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[{ label: 'Started', val: fmtDateShort(config.emergency.startTime) }, { label: 'Est. End', val: fmtDateShort(config.emergency.endTime) }, { label: 'Waiting', val: `${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}` }].map(({ label, val }) => (
                    <div key={label} className="bg-gray-50 border border-gray-100 dark:bg-white/[0.03] dark:border-white/[0.06] rounded-xl p-4">
                      <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{val}</p>
                    </div>
                  ))}
                </div>
                {countdown && (
                  <div>
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">Time remaining</p>
                    <div className="flex gap-3">
                      {[{ l: 'hrs', v: String(countdown.h).padStart(2,'0') }, { l: 'min', v: String(countdown.m).padStart(2,'0') }, { l: 'sec', v: String(countdown.s).padStart(2,'0') }].map(({ l, v }) => (
                        <div key={l} className="flex flex-col items-center bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 min-w-[72px]">
                          <span className="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-300">{v}</span>
                          <span className="text-[10px] text-red-500 dark:text-red-400/60 uppercase tracking-wider mt-0.5">{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {config.emergency.reason && (
                  <div className="flex items-start gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-200/80 leading-relaxed">{config.emergency.reason}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button onClick={handleSendNotifications} disabled={saving || subscriberCount === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors">
                    <Send className="h-4 w-4" /> {saving ? 'Sending…' : `Notify ${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}`}
                  </button>
                  <button onClick={handleDeactivateEmergency} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors">
                    <PowerOff className="h-4 w-4" /> Deactivate Maintenance
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">End Time (optional)</label>
                    <input type="datetime-local" value={emEndTime} onChange={(e) => setEmEndTime(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition-colors dark:[color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Reason / Message</label>
                    <input type="text" value={emReason} onChange={(e) => setEmReason(e.target.value)} placeholder="e.g. Database migration"
                      className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle checked={emNotify} onChange={() => setEmNotify((v) => !v)} />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Auto-notify subscribers when maintenance ends</p>
                    <p className="text-xs text-gray-500">Emails sent automatically when you deactivate</p>
                  </div>
                </div>
                <button onClick={handleActivateEmergency} disabled={saving}
                  className="group flex items-center gap-3 px-6 py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-red-900/30">
                  <Power className="h-4 w-4" />
                  Activate Emergency Maintenance
                  <ChevronRight className="h-4 w-4 opacity-60 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-xs text-gray-600">⚡ Takes effect immediately. Admins keep full access.</p>
              </div>
            )}
          </div>
        </div>

        {/* Scheduled */}
        <div className={`relative rounded-2xl border overflow-hidden transition-all duration-500 ${isScheduledActive ? 'border-amber-500/40 bg-amber-500/[0.03]' : 'border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.02]'}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isScheduledActive ? 'bg-amber-500/15 border border-amber-500/25' : 'bg-gray-100 border border-gray-200 dark:bg-white/[0.05] dark:border-white/10'}`}>
                <Calendar className={`h-4 w-4 ${isScheduledActive ? 'text-amber-400' : 'text-gray-400'}`} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Scheduled Maintenance</h2>
                <p className="text-xs text-gray-500">Plan ahead — users see an alert banner before it starts</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider border ${isScheduledActive ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-gray-500 border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.03]'}`}>
              {isScheduledActive ? '● Scheduled' : '○ None'}
            </div>
          </div>
          <div className="p-6 space-y-5">
            {isScheduledActive && (
              <div className="bg-amber-500/[0.07] border border-amber-500/25 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-mono text-amber-500/60 uppercase tracking-wider mb-0.5">Start</p>
                    <p className="text-gray-900 dark:text-white font-medium">{fmtDate(config.scheduled.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-amber-500/60 uppercase tracking-wider mb-0.5">End</p>
                    <p className="text-gray-900 dark:text-white font-medium">{fmtDate(config.scheduled.endTime)}</p>
                  </div>
                </div>
                {config.scheduled.reason && <p className="text-sm text-amber-700 dark:text-amber-200/70">{config.scheduled.reason}</p>}
                <div>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">What users see ↓</p>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-sm text-amber-700 dark:text-amber-200">
                    <span className="relative flex-shrink-0 h-2 w-2">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                    </span>
                    <span className="flex-1">
                      <span className="font-semibold text-amber-700 dark:text-amber-300">Scheduled maintenance</span>
                      {' — BroCode will be offline on '}
                      <span className="font-medium">{fmtDateShort(config.scheduled.startTime)}</span>
                      {config.scheduled.endTime && (
                        <> until <span className="font-medium">{fmtDateShort(config.scheduled.endTime)}</span></>
                      )}
                    </span>
                    <span className="text-xs text-amber-700/50 dark:text-amber-300/50">✕</span>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {isScheduledActive ? 'Update Start Time' : 'Start Time'}
                </label>
                <input type="datetime-local" value={scStart} onChange={(e) => setScStart(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition-colors dark:[color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">End Time (optional)</label>
                <input type="datetime-local" value={scEnd} onChange={(e) => setScEnd(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition-colors dark:[color-scheme:dark]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Reason / Note for users</label>
              <input type="text" value={scReason} onChange={(e) => setScReason(e.target.value)} placeholder="e.g. Infrastructure upgrade"
                className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors" />
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleSchedule} disabled={saving || !scStart}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/80 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-bold rounded-xl transition-colors">
                <Calendar className="h-4 w-4" />
                {saving ? 'Saving…' : isScheduledActive ? 'Update Schedule' : 'Schedule Maintenance'}
              </button>
              {isScheduledActive && (
                <button onClick={handleCancelScheduled} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors">
                  <Trash2 className="h-4 w-4" /> Cancel Schedule
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600">
              📣 Users see a dismissible alert strip — their dismiss state persists so it does not keep reappearing.
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 dark:bg-white/[0.05] dark:border-white/10 flex items-center justify-center">
              <Bell className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Notification Center</h2>
              <p className="text-xs text-gray-500">Users who subscribed on the maintenance page</p>
            </div>
          </div>
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{subscriberCount}</p>
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Subscribers</p>
              </div>
              <div className="h-10 w-px bg-gray-200 dark:bg-white/[0.06]" />
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {subscriberCount === 0
                  ? 'No subscribers yet. Users can sign up on the maintenance page.'
                  : `${subscriberCount} user${subscriberCount !== 1 ? 's' : ''} will receive an email.`}
              </p>
            </div>
            <button onClick={handleSendNotifications} disabled={saving || subscriberCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex-shrink-0">
              <Send className="h-4 w-4" />
              {saving ? 'Sending…' : "Send back online emails"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
