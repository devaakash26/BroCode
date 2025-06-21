import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import ClientLayout from './client-layout';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"



const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: {
    default: 'BroCode',
    template: '%s | BroCode'
  },
  description: 'A platform for mastering data structures and algorithms through collaborative challenges',
  keywords: ['coding', 'interviews', 'dsa', 'algorithms', 'data structures', 'programming', 'tech'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground`}>
        <Providers>
          <ClientLayout>{children}
            <Analytics />
            <SpeedInsights/>
          </ClientLayout>
        </Providers>

      </body>
    </html>
  );
} 
