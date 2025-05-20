'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LoadingOverlay } from '@/components/ui/loading';

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset loading state when the route actually changes
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  // Set up event listeners for navigation events
  useEffect(() => {
    // Handle route change start (triggered by our custom NavLink)
    const handleRouteChangeStart = () => {
      setIsLoading(true);
    };
    
    // Handle other navigation methods
    const handleLinkClick = (e) => {
      // Only handle internal links (Next.js links) that aren't using our custom NavLink
      const target = e.target.closest('a');
      if (
        target && 
        target.href && 
        !target.target && 
        target.href.startsWith(window.location.origin) &&
        !target.href.includes('#') && // Ignore anchor links
        !e.metaKey && !e.ctrlKey && !e.shiftKey // Ignore modified clicks that open in new tabs/windows
      ) {
        setIsLoading(true);
      }
    };
    
    // For form submissions
    const handleFormSubmit = () => {
      setIsLoading(true);
    };
    
    // Listen for our custom event from NavLink
    window.addEventListener('route-change-start', handleRouteChangeStart);
    // Also catch regular link clicks not using our NavLink
    document.addEventListener('click', handleLinkClick);
    // Handle form submissions
    document.addEventListener('submit', handleFormSubmit);
    
    return () => {
      window.removeEventListener('route-change-start', handleRouteChangeStart);
      document.removeEventListener('click', handleLinkClick);
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, []);

  // Use a delayed display to prevent flashing during fast navigations
  const [showLoading, setShowLoading] = useState(false);
  
  useEffect(() => {
    let timer;
    if (isLoading) {
      // Wait a bit before showing the loader to avoid flashing
      timer = setTimeout(() => {
        setShowLoading(true);
      }, 200);
    } else {
      setShowLoading(false);
    }
    
    return () => clearTimeout(timer);
  }, [isLoading]);
  
  return showLoading ? <LoadingOverlay message="Loading..." /> : null;
} 