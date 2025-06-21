'use client';

import Link from 'next/link';
import { useCallback } from 'react';

export function NavLink({ href, onClick, children, ...props }) {
  // Use global loading state from navigation-loader
  const triggerLoadingState = useCallback(() => {
    // Dispatch a custom event that navigation-loader will listen for
    window.dispatchEvent(new CustomEvent('route-change-start'));
    
    // Call original onClick if provided
    if (onClick) onClick();
  }, [onClick]);

  return (
    <Link 
      href={href} 
      onClick={triggerLoadingState}
      {...props}
    >
      {children}
    </Link>
  );
} 
