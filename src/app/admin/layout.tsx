import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await validateSession();
  
  if (!isAuthenticated) {
    redirect('/login');
  }

  return <>{children}</>;
} 