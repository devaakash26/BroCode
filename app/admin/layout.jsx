import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminLayout from '@/app/components/admin/AdminLayout';

export const metadata = {
  title: 'Admin Portal - BroCode',
  description: 'Admin portal for BroCode platform',
};

export default async function Layout({ children }) {
  const session = await getServerSession(authOptions);

  // Redirect if not logged in or not an admin
  if (!session || session.user.role !== 'PLATFORM_ADMIN') {
    redirect('/');
  }

  return (
    <AdminLayout user={session.user}>
      {children}
    </AdminLayout>
  );
} 
