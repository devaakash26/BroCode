'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NavLink } from './nav-link';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, ChevronDown, User, LogOut, Settings, PanelLeft, Code, Users, BookOpen, List, HelpCircle } from 'lucide-react';
import ThemeToggle from './theme-toggle';
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { usePathname } from 'next/navigation';
import { useProblemDrawer } from '@/app/context/ProblemDrawerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

export default function Navbar({ 
  sidebarCollapsed, 
  setSidebarCollapsed, 
  isMobile
}) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { openDrawer } = useProblemDrawer();

  const isProblemPage = pathname.startsWith('/problems/') && pathname.length > '/problems/'.length;
  
  const mainNavItems = [
    { name: 'Problems', href: '/problems', icon: <Code className="h-4 w-4 mr-2" /> },
    { name: 'Submissions', href: '/submissions', icon: <List className="h-4 w-4 mr-2" /> },
    { name: 'Groups', href: '/groups', icon: <Users className="h-4 w-4 mr-2" /> },
    { name: 'Leaderboard', href: '/leaderboard', icon: <BookOpen className="h-4 w-4 mr-2" /> },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Desktop sidebar toggle */}
            {!isMobile && !isProblemPage && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                type="button"
                className="hidden lg:inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 mr-2"
              >
                <span className="sr-only">Toggle sidebar</span>
                <PanelLeft className="block h-5 w-5" aria-hidden="true" />
              </button>
            )}
            
            {/* Problem List Toggle */}
            {isProblemPage && (
              <button
                onClick={openDrawer}
                type="button"
                className="hidden lg:inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 mr-2"
              >
                <List className="block h-5 w-5" aria-hidden="true" />
                <span className="ml-2">Problem List</span>
              </button>
            )}
            
            {/* Logo for mobile */}
            {isMobile && (
              <div className="flex-shrink-0 flex items-center">
                <NavLink href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  BroCode
                </NavLink>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar>
                      <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-800">
                        {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink href="/dashboard" className="flex w-full cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink href="/profile" className="flex w-full cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Profile
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink href="/help" className="flex w-full cursor-pointer">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Help
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-4">
                <NavLink href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </NavLink>
                <NavLink href="/auth/signup">
                  <Button>Sign Up</Button>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:hidden`} id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
          
          {session?.user.role === 'PLATFORM_ADMIN' && (
            <NavLink
              href="/admin"
              className="flex items-center px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </NavLink>
          )}
        </div>
        
        <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
          {session ? (
            <>
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <Avatar>
                    <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-800">
                      {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800 dark:text-white">{session.user.name}</div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{session.user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <NavLink
                  href="/dashboard"
                  className="flex items-center px-4 py-2 text-base font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </NavLink>
                <NavLink
                  href="/profile"
                  className="flex items-center px-4 py-2 text-base font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </NavLink>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center px-4 py-2 text-base font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-1 px-2">
              <NavLink
                href="/auth/signin"
                className="flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </NavLink>
              <NavLink
                href="/auth/signup"
                className="flex justify-center w-full px-4 py-2 text-base font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign up
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 
