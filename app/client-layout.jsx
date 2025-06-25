'use client';

import { Inter } from 'next/font/google';
import Navbar from './components/navbar';
import SidebarNavigation from './components/sidebar-navigation';
import Footer from './components/footer';
import VerificationAlert from './components/VerificationAlert';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ProblemDrawerProvider } from './context/ProblemDrawerContext';
import ProblemListDrawer from './components/problems/ProblemListDrawer';

const inter = Inter({ subsets: ['latin'] });

export default function ClientLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
      </div>
    </ProblemDrawerProvider>
  );
} 
