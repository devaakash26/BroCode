'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Code, 
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

export default function SidebarNavigation({ collapsed, setCollapsed, className = '' }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    { name: 'Leaderboard', href: '/leaderboard', icon: <Trophy className="h-5 w-5" /> },
  ];

  // Lists for logged in users
  const problemLists = [
    { name: 'All Problems', href: '/problems', icon: <BarChart2 className="h-4 w-4" /> },
    { name: 'Solved', href: '/problems?status=solved', icon: <CheckCircle className="h-4 w-4" /> },
    { name: 'To Do', href: '/problems?status=todo', icon: <Clock className="h-4 w-4" /> },
    { name: 'Bookmarked', href: '/problems?bookmarked=true', icon: <Bookmark className="h-4 w-4" /> },
  ];

  // Mobile bottom navigation bar
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
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
                  <span className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {item.icon}
                  </span>
                  <span className="text-xs mt-1 font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className={`h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} ${className}`}>
      <div className="flex items-center justify-between p-3 h-16 border-b border-gray-200 dark:border-gray-800">
        {!collapsed ? (
          <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            BroCode
          </Link>
        ) : (
          <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            BC
          </Link>
        )}
       
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-2">
          {!collapsed && (
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Navigation
            </h3>
          )}
          <ul className="mt-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-3 py-2.5 rounded-md group transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="ml-3 text-sm font-medium">{item.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {session && (
          <div className="px-3 py-2 mt-2">
            {!collapsed && (
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Problem Lists
              </h3>
            )}
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
                      className={`flex items-center px-3 py-2 rounded-md group transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="ml-3 text-sm font-medium">{item.name}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {session?.user.role === 'PLATFORM_ADMIN' && !collapsed && (
          <div className="px-3 py-2 mt-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Admin
            </h3>
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
                  <span className="ml-3 text-sm font-medium">Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 
