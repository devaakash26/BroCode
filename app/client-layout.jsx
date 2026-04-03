'use client';

import { Inter } from 'next/font/google';
import Navbar from './components/navbar';
import SidebarNavigation from './components/sidebar-navigation';
import Footer from './components/footer';
import VerificationAlert from './components/VerificationAlert';
import MaintenanceBanner from './components/MaintenanceBanner';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ProblemDrawerProvider } from './context/ProblemDrawerContext';
import ProblemListDrawer from './components/problems/ProblemListDrawer';

const inter = Inter({ subsets: ['latin'] });

/* ── Maintenance overlay ─────────────────────────────────────────── */
function MaintenanceOverlay({ info }) {
  const [sub, setSub] = useState('');
  const [subState, setSubState] = useState('idle');
  const [subMsg, setSubMsg] = useState('');

  const fmtDate = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true }) + ' IST';
  };

  const handleSub = async (e) => {
    e.preventDefault();
    if (!sub) return;
    setSubState('loading');
    try {
      const res = await fetch('/api/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: sub }) });
      const data = await res.json();
      if (data.success) { setSubState('success'); setSubMsg(data.message || "You're on the list!"); }
      else { setSubState('error'); setSubMsg(data.error || 'Something went wrong.'); }
    } catch { setSubState('error'); setSubMsg('Network error. Try again.'); }
  };

  return (
    <>
      <style>{`
        @keyframes _gear-cw  { to { transform: rotate(360deg);  } }
        @keyframes _gear-ccw { to { transform: rotate(-360deg); } }
        @keyframes _orb-f    { 0%,100% { transform: translateY(0) scale(1); opacity:.12; } 50% { transform: translateY(-28px) scale(1.07); opacity:.2; } }
        @keyframes _orb-f2   { 0%,100% { transform: translateY(0) scale(1); opacity:.10; } 50% { transform: translateY(-20px) scale(1.05); opacity:.17; } }
        @keyframes _pulse-in { 0% { transform:scale(1); opacity:.5; } 100% { transform:scale(1.7); opacity:0; } }
        @keyframes _fade-up  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        ._g-cw  { animation: _gear-cw  9s linear infinite; transform-origin: center; }
        ._g-ccw { animation: _gear-ccw 7s linear infinite; transform-origin: center; }
        ._orb   { animation: _orb-f  7s ease-in-out infinite; }
        ._orb2  { animation: _orb-f2 9s ease-in-out infinite 2.5s; }
        ._orb3  { animation: _orb-f2 8s ease-in-out infinite 4s; }
        ._pu    { animation: _pulse-in 2.2s ease-out infinite; }
        ._fu    { animation: _fade-up .5s ease both; }
        ._fu1   { animation: _fade-up .5s ease .1s both; }
        ._fu2   { animation: _fade-up .5s ease .22s both; }
        ._fu3   { animation: _fade-up .5s ease .36s both; }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#07090e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Orbs */}
        <div className="_orb" style={{ position:'absolute', top:'-8%', left:'-6%', width:480, height:480, borderRadius:'50%', background:'#ea580c', filter:'blur(130px)', pointerEvents:'none' }} />
        <div className="_orb2" style={{ position:'absolute', bottom:'-12%', right:'-5%', width:420, height:420, borderRadius:'50%', background:'#7c3aed', filter:'blur(140px)', pointerEvents:'none' }} />
        <div className="_orb3" style={{ position:'absolute', top:'45%', left:'58%', width:280, height:280, borderRadius:'50%', background:'#1d4ed8', filter:'blur(110px)', pointerEvents:'none' }} />
        {/* Grid */}
        <div style={{ position:'absolute', inset:0, opacity:.025, backgroundImage:'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize:'56px 56px', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:460, padding:'0 24px', textAlign:'center' }}>
          {/* Logo */}
          <div className="_fu" style={{ marginBottom:32, fontFamily:'Courier New, monospace', fontSize:15, fontWeight:700, letterSpacing:3, color:'rgba(255,255,255,0.7)', textTransform:'uppercase' }}>
            BRO<span style={{ color:'#f97316' }}>.</span>CODE
          </div>

          {/* Gear cluster */}
          <div className="_fu1" style={{ position:'relative', display:'inline-flex', width:72, height:72, marginBottom:28 }}>
            <span className="_pu" style={{ position:'absolute', inset:0, margin:'auto', width:56, height:56, borderRadius:'50%', border:'1px solid rgba(249,115,22,0.35)', display:'block' }} />
            <svg className="_g-cw" style={{ position:'absolute', inset:0, width:'100%', height:'100%', color:'rgba(249,115,22,0.75)' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.73-.07-1.08l2.32-1.84c.21-.16.26-.44.13-.67l-2.2-3.84c-.13-.23-.42-.31-.65-.23l-2.73 1.1c-.57-.44-1.18-.8-1.86-1.07l-.42-2.9C14.19 2.11 13.96 2 13.72 2h-4.4c-.24 0-.47.11-.5.34l-.42 2.9c-.68.27-1.29.63-1.86 1.07L3.82 5.22c-.23-.08-.52 0-.65.23L.97 9.29c-.13.23-.08.51.13.67L3.42 11.8c-.04.35-.07.7-.07 1.08s.03.73.07 1.08L1.1 15.8c-.21.16-.26.44-.13.67l2.2 3.84c.13.23.42.31.65.23l2.73-1.1c.57.44 1.18.8 1.86 1.07l.42 2.9c.03.23.26.34.5.34h4.4c.24 0 .47-.11.5-.34l.42-2.9c.68-.27 1.29-.63 1.86-1.07l2.73 1.1c.23.08.52 0 .65-.23l2.2-3.84c.13-.23.08-.51-.13-.67l-2.32-1.82z"/>
            </svg>
            <svg className="_g-ccw" style={{ position:'absolute', bottom:-2, right:-2, width:34, height:34, color:'rgba(139,92,246,0.65)' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.73-.07-1.08l2.32-1.84c.21-.16.26-.44.13-.67l-2.2-3.84c-.13-.23-.42-.31-.65-.23l-2.73 1.1c-.57-.44-1.18-.8-1.86-1.07l-.42-2.9C14.19 2.11 13.96 2 13.72 2h-4.4c-.24 0-.47.11-.5.34l-.42 2.9c-.68.27-1.29.63-1.86 1.07L3.82 5.22c-.23-.08-.52 0-.65.23L.97 9.29c-.13.23-.08.51.13.67L3.42 11.8c-.04.35-.07.7-.07 1.08s.03.73.07 1.08L1.1 15.8c-.21.16-.26.44-.13.67l2.2 3.84c.13.23.42.31.65.23l2.73-1.1c.57.44 1.18.8 1.86 1.07l.42 2.9c.03.23.26.34.5.34h4.4c.24 0 .47-.11.5-.34l.42-2.9c.68-.27 1.29-.63 1.86-1.07l2.73 1.1c.23.08.52 0 .65-.23l2.2-3.84c.13-.23.08-.51-.13-.67l-2.32-1.82z"/>
            </svg>
          </div>

          {/* Label */}
          <div className="_fu1" style={{ fontFamily:'Courier New, monospace', fontSize:10, fontWeight:700, letterSpacing:3, textTransform:'uppercase', color:'rgba(249,115,22,0.8)', marginBottom:10 }}>Scheduled Maintenance</div>

          {/* Heading */}
          <h1 className="_fu2" style={{ margin:'0 0 12px', fontSize:32, fontWeight:700, lineHeight:1.15, color:'#fff' }}>We&apos;ll be right back.</h1>
          <p className="_fu2" style={{ margin:'0 0 24px', fontSize:14, lineHeight:1.7, color:'rgba(255,255,255,0.45)', maxWidth:340, marginLeft:'auto', marginRight:'auto' }}>
            BroCode is currently undergoing maintenance. Hang tight — we&apos;re working on it.
          </p>

          {/* Time info */}
          {(info?.startTime || info?.endTime) && (
            <div className="_fu2" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'16px 20px', marginBottom:20, textAlign:'left' }}>
              {info.startTime && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom: info.endTime ? 12 : 0, borderBottom: info.endTime ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span style={{ fontFamily:'Courier New, monospace', fontSize:9, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>Started</span>
                  <span style={{ fontSize:12, fontWeight:500, color:'#fff' }}>{fmtDate(info.startTime)}</span>
                </div>
              )}
              {info.endTime && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop: info.startTime ? 12 : 0 }}>
                  <span style={{ fontFamily:'Courier New, monospace', fontSize:9, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>Est. End</span>
                  <span style={{ fontSize:12, fontWeight:500, color:'#fff' }}>{fmtDate(info.endTime)}</span>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          {info?.reason && (
            <div className="_fu2" style={{ background:'rgba(249,115,22,0.07)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:10, padding:'10px 16px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:8, textAlign:'left' }}>
              <span style={{ color:'#f97316', flexShrink:0, marginTop:1 }}>⚠</span>
              <p style={{ margin:0, fontSize:12, color:'rgba(253,186,116,0.85)', lineHeight:1.6 }}>{info.reason}</p>
            </div>
          )}

          {/* Notify me */}
          <div className="_fu3" style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:20, marginTop:4 }}>
            {subState === 'success' ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#22c55e' }}>✓</div>
                <p style={{ margin:0, fontSize:13, color:'#4ade80', fontWeight:500 }}>{subMsg}</p>
                <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,0.3)' }}>Email sent when we&apos;re back online.</p>
              </div>
            ) : (
              <>
                <p style={{ margin:'0 0 10px', fontSize:12, color:'rgba(255,255,255,0.35)' }}>Get notified when we&apos;re back online.</p>
                <form onSubmit={handleSub} style={{ display:'flex', gap:8 }}>
                  <input type="email" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="your@email.com" required
                    style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#fff', outline:'none' }} />
                  <button type="submit" disabled={subState === 'loading'}
                    style={{ padding:'10px 16px', background:'#f97316', border:'none', borderRadius:10, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', opacity: subState === 'loading' ? 0.6 : 1 }}>
                    {subState === 'loading' ? '…' : 'Notify me'}
                  </button>
                </form>
                {subState === 'error' && <p style={{ margin:'6px 0 0', fontSize:11, color:'#f87171' }}>{subMsg}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main client layout ──────────────────────────────────────────── */
export default function ClientLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState(null); // null = not active
  const pathname = usePathname();

  const isProblemPage = pathname.startsWith('/problems/');
  const isAdminPage = pathname.startsWith('/admin');

  // Load sidebar state from local storage on mount
  useEffect(() => {
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    setSidebarCollapsed(isCollapsed);
  }, []);

  // Handle responsive behavior and initial collapse state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Function to toggle sidebar and save to local storage
  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar-collapsed', newState);
      return newState;
    });
  };

  // Poll maintenance status every 5 seconds (skip on admin pages — admins bypass maintenance)
  useEffect(() => {
    if (isAdminPage) return;

    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        const data = await res.json();
        if (data.active && data.maintenance) {
          setMaintenanceInfo(data.maintenance);
        } else {
          setMaintenanceInfo(null);
        }
      } catch {
        // If the check fails, don't block the user
      }
    };

    // Check immediately, then every 5 seconds
    checkMaintenance();
    const id = setInterval(checkMaintenance, 5000);
    return () => clearInterval(id);
  }, [isAdminPage]);

  return (
    <ProblemDrawerProvider>
      <div className="flex h-screen overflow-hidden">
        {!isMobile && !isAdminPage && !isProblemPage && (
          <div className="fixed lg:static z-50 lg:z-0 transition-all duration-300 translate-x-0">
            <SidebarNavigation 
              collapsed={sidebarCollapsed} 
              setCollapsed={handleToggleSidebar} 
              className="h-screen"
            />
          </div>
        )}
        
        <div className={`flex-1 flex flex-col overflow-x-hidden ${!isAdminPage && !isProblemPage ? '' : 'w-full'}`}>
          {!isAdminPage && (
            <>
              <MaintenanceBanner />
              <Navbar 
                sidebarCollapsed={sidebarCollapsed} 
                setSidebarCollapsed={handleToggleSidebar}
                isMobile={isMobile}
              />
              <div className="px-4 md:px-6 lg:px-8">
                <VerificationAlert />
              </div>
            </>
          )}
          <main className={`flex-1 p-0 ${isMobile && !isAdminPage ? 'pb-20' : ''}`}>
            {children}
          </main>
          {!isMobile && !isAdminPage && <Footer />}
        </div>

        {isMobile && !isAdminPage && (
          <SidebarNavigation 
            collapsed={true}
            setCollapsed={() => {}}
          />
        )}
        <ProblemListDrawer />
        {/* Maintenance overlay — shown when emergency maintenance activates while user is browsing */}
        {maintenanceInfo && <MaintenanceOverlay info={maintenanceInfo} />}
      </div>
    </ProblemDrawerProvider>
  );
} 
