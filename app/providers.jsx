'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/lib/store/store';

export default function Providers({ children }) {
  return (
    <ReduxProvider store={store}>
      <SessionProvider
        // Optimize session fetching to reduce API calls
        refetchInterval={0}  // Disable periodic refetching (JWT handles auth)
        refetchOnWindowFocus={false}  // Don't refetch when user focuses window
        refetchWhenOffline={false}  // Don't refetch when offline
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster position="top-right" />
          {children}
        </ThemeProvider>
      </SessionProvider>
    </ReduxProvider>
  );
} 
