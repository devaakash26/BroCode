import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import ClientLayout from './client-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: {
    default: 'NeetCode',
    template: '%s | NeetCode'
  },
  description: 'A platform for mastering data structures and algorithms through collaborative challenges',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground`}>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
} 