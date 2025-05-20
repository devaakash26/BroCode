'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import NavigationLoader from './components/navigation-loader';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Toaster position="top-right" />
        <NavigationLoader />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
} 