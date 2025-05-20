'use client';

import { Inter } from 'next/font/google';
import Navbar from './components/navbar';
import SidebarNavigation from './components/sidebar-navigation';
import Footer from './components/footer';
import VerificationAlert from './components/VerificationAlert';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export default function ClientLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  
  // Check if we're on an admin page
  const isAdminPage = pathname.startsWith('/admin');

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - only visible on desktop and when not on admin pages */}
      {!isMobile && !isAdminPage && (
        <div className="fixed lg:static z-50 lg:z-0 transition-all duration-300 translate-x-0">
          <SidebarNavigation 
            collapsed={sidebarCollapsed} 
            setCollapsed={setSidebarCollapsed} 
            className="h-screen"
          />
        </div>
      )}
      
      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-x-hidden ${!isAdminPage ? '' : 'w-full'}`}>
        {!isAdminPage && (
          <>
            <Navbar 
              sidebarCollapsed={sidebarCollapsed} 
              setSidebarCollapsed={setSidebarCollapsed}
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

      {/* Mobile bottom navigation - appears on mobile devices and when not on admin pages */}
      {isMobile && !isAdminPage && (
        <SidebarNavigation 
          collapsed={true}
          setCollapsed={() => {}}
        />
      )}
    </div>
  );
} 