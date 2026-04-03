import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import ClientLayout from './client-layout';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMaintenanceConfig, getActiveMaintenance, isMaintenanceActive } from '@/app/lib/maintenance';
import MaintenancePage from '@/app/maintenance/page';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: {
    default: 'BroCode',
    template: '%s | BroCode'
  },
  description: 'A platform for mastering data structures and algorithms through collaborative challenges',
  keywords: ['coding', 'interviews', 'dsa', 'algorithms', 'data structures', 'programming', 'tech'],
};

export default async function RootLayout({ children }) {
  let maintenanceActive = false;
  let activeMaintenance = null;

  try {
    const config = await getMaintenanceConfig();
    maintenanceActive = isMaintenanceActive(config);
    if (maintenanceActive) {
      activeMaintenance = getActiveMaintenance(config);
    }
  } catch {
    // If DB is unreachable, don't block the page
  }

  // Check if the current user is an admin (admins bypass maintenance)
  let isAdmin = false;
  if (maintenanceActive) {
    try {
      const session = await getServerSession(authOptions);
      isAdmin = session?.user?.role === 'PLATFORM_ADMIN';
    } catch {
      // If session check fails, fall through to maintenance page
    }
  }

  if (maintenanceActive && !isAdmin) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <MaintenancePage maintenance={activeMaintenance} />
        </body>
      </html>
    );
  }

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
