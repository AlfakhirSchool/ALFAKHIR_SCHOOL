'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import PageTransition from '@/components/PageTransition';
import WelcomePopup from '@/components/WelcomePopup';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

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
      <WelcomePopup nama={user?.nama || 'Admin'} />
      <div className="flex min-h-screen">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        <main
          className="flex-1 bg-gray-50 min-w-0 transition-all duration-300"
          style={{ marginLeft: collapsed ? 64 : 256 }}
        >
          <AnnouncementBanner feedbackPath="/feedback" />
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </main>
      </div>
    </>
  );
}
