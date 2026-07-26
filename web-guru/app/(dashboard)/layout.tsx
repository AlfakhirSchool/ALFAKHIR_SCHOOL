'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import PageTransition from '@/components/PageTransition';
import WelcomePopup from '@/components/WelcomePopup';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHydrated(true);
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <>
      <LoadingScreen show={loading} />
      <WelcomePopup nama={user?.nama || 'Guru'} />
      <div className="flex">
        <Sidebar />
        <main className="ml-64 flex-1 min-h-screen bg-gray-50">
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </main>
      </div>
    </>
  );
}
