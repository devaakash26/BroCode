'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Code, 
  PenTool,
  Users, 
  Trophy, 
  Home, 
  ChevronRight, 
  ChevronLeft,
  BookOpen,
  PanelLeft,
  BarChart2,
  CheckCircle,
  Clock,
  Star,
  Bookmark,
  LayoutDashboard
} from 'lucide-react';

// Hover intent: open a beat after the pointer arrives, close a beat after it leaves,
// so passing across the rail on the way somewhere else doesn't flash it open.
const OPEN_DELAY = 90;
const CLOSE_DELAY = 180;

// `forceOpen` renders the full sidebar (no hover rail), e.g. inside the navbar drawer.
// `mobile` renders the bottom tab bar; the layout decides, so both agree on the breakpoint.
export default function SidebarNavigation({ className = '', forceOpen = false, mobile = false }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoverOpen, setOpen] = useState(false);
  const open = forceOpen || hoverOpen;
  const timer = useRef(null);
  const collapsed = !open;

  const schedule = (next, ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), ms);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  // Fold away after navigating.
  useEffect(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent hydration errors
  if (!mounted) return null;

  const navItems = [
    { name: 'Home', href: '/', icon: <Home className="h-5 w-5" /> },
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Problems', href: '/problems', icon: <Code className="h-5 w-5" /> },
    { name: 'Groups', href: '/groups', icon: <Users className="h-5 w-5" /> },
    { name: 'Playground', href: '/playground', icon: <PenTool className="h-5 w-5" />, badge: 'New' },
    { name: 'Leaderboard', href: '/leaderboard', icon: <Trophy className="h-5 w-5" /> },
  ];

  // Lists for logged in users
  const problemLists = [
    { name: 'All Problems', href: '/problems', icon: <BarChart2 className="h-4 w-4" /> },
    { name: 'Solved', href: '/problems?status=solved', icon: <CheckCircle className="h-4 w-4" /> },
    { name: 'To Do', href: '/problems?status=todo', icon: <Clock className="h-4 w-4" /> },
    { name: 'Bookmarked', href: '/problems?bookmarked=true', icon: <Bookmark className="h-4 w-4" /> },
  ];

  // Mobile bottom navigation bar: five tabs fit; the rest live in the navbar drawer.
  if (mobile || (isMobile && !forceOpen)) {
    const tabs = navItems.filter((item) => item.name !== 'Leaderboard');
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 shadow-lg pb-[env(safe-area-inset-bottom)]">
        <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center relative"
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-b-full" />
                )}
                <div className={`flex flex-col items-center justify-center ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  <span className={`relative ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {item.icon}
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-4 px-1 rounded-full text-[8px] leading-[14px] font-bold uppercase tracking-wide text-white bg-gradient-to-r from-indigo-500 to-pink-500">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] mt-1 font-medium truncate max-w-full px-1">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const label = `ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-150 ${open ? 'opacity-100 delay-75' : 'opacity-0'}`;
  const heading = `h-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap transition-opacity duration-150 ${open ? 'opacity-100 delay-75' : 'opacity-0'}`;

  // Desktop sidebar: a 64px rail that expands over the page on hover/focus.
  return (
    <div className={`relative z-40 h-full flex-shrink-0 ${forceOpen ? 'w-64' : 'w-16'} ${className}`}>
    <nav
      aria-label="Main"
      onMouseEnter={forceOpen ? undefined : () => schedule(true, OPEN_DELAY)}
      onMouseLeave={forceOpen ? undefined : () => schedule(false, CLOSE_DELAY)}
      onFocus={forceOpen ? undefined : () => schedule(true, 0)}
      onBlur={forceOpen ? undefined : (e) => !e.currentTarget.contains(e.relatedTarget) && schedule(false, 0)}
      className={`absolute inset-y-0 left-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-[width,box-shadow] duration-200 ease-out ${
        forceOpen ? 'w-64' : open ? 'w-64 shadow-2xl shadow-black/10 dark:shadow-black/50' : 'w-16'
      }`}
    >
      <div className="flex items-center p-3 h-16 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="relative block h-7 w-full text-xl font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap" aria-label="BroCode home">
          <span className={`absolute left-1 top-0 transition-opacity duration-150 ${open ? 'opacity-0' : 'opacity-100'}`}>BC</span>
          <span className={`absolute left-1 top-0 transition-opacity duration-150 ${open ? 'opacity-100' : 'opacity-0'}`}>BroCode</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-2">
          <h3 className={heading}>Navigation</h3>
          <ul className="mt-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center px-3 py-2.5 rounded-md group transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className={`relative ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                      {item.icon}
                      {item.badge && (
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-white dark:ring-gray-900 transition-opacity ${open ? 'opacity-0' : 'opacity-100'}`}
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className={label}>{item.name}</span>
                    {item.badge && (
                      <span
                        className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white bg-gradient-to-r from-indigo-500 to-pink-500 shadow-sm transition-opacity ${open ? 'opacity-100 delay-75' : 'opacity-0'}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {session && (
          <div className="px-3 py-2 mt-2">
            <h3 className={heading}>Problem Lists</h3>
            <ul className="mt-2 space-y-1">
              {problemLists.map((item) => {
                const [itemPath, itemQuery] = item.href.split('?');
                const currentQuery = searchParams.toString();
                let isActive;
                if (itemQuery) {
                  isActive = pathname === itemPath && itemQuery === currentQuery;
                } else {
                  isActive = pathname === itemPath && currentQuery === '';
                }
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={`flex items-center px-3 py-2 rounded-md group transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                        {item.icon}
                      </span>
                      <span className={label}>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(session?.user.role === 'PLATFORM_ADMIN' || session?.user.role === 'TEMP_ADMIN') && (
          <div className="px-3 py-2 mt-2">
            <h3 className={heading}>Admin</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href="/admin"
                  className={`flex items-center px-3 py-2 rounded-md group transition-colors ${
                    pathname === '/admin'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className={`${pathname === '/admin' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                    <PanelLeft className="h-4 w-4" />
                  </span>
                  <span className={label}>Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
    </div>
  );
} 
