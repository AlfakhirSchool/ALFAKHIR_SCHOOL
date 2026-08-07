'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import PageTransition from '@/components/PageTransition';
import WelcomePopup from '@/components/WelcomePopup';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import AiChat from '@/components/AiChat';
import { useAuthStore } from '@/store/authStore';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const prevUserId = useRef<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const currentId = user?.id ?? null;
    if (prevUserId.current !== null && prevUserId.current !== currentId) qc.clear();
    prevUserId.current = currentId;
  }, [user?.id, qc]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    // Hanya guru SD atau guru tanpa school_levels (semua jenjang)
    const levels = user?.school_levels ?? [];
    const allowed = user?.role === 'guru' && (levels.length === 0 || levels.includes('SD'));
    if (!allowed) { router.push('/login'); return; }
  }, [hydrated, isAuthenticated, user, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <>
      <LoadingScreen show={loading} />
      <WelcomePopup nama={user?.nama || 'Guru'} />
      <AiChat />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        </div>

        {/* Mobile sidebar drawer */}
        <div
          className={`fixed inset-y-0 left-0 z-40 md:hidden transition-transform duration-300 ease-in-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </div>

        <main
          className="flex-1 bg-gray-50 min-w-0 transition-[margin] duration-300 ml-0"
          style={{ ['--sidebar-w' as any]: collapsed ? '64px' : '256px' }}
        >
          <style>{`@media (min-width: 768px) { main { margin-left: var(--sidebar-w) !important; } }`}</style>
          {/* Mobile topbar */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            >
              <Menu size={20} />
            </button>
            <img src="/logo-sd.png" alt="Logo SD" className="w-7 h-7 object-contain" />
            <span className="font-semibold text-sm text-gray-800 truncate">Guru SD Al-Fakhir</span>
          </div>

          <AnnouncementBanner feedbackPath="/feedback" />
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
          <footer className="text-center py-3 text-xs text-gray-400 border-t border-gray-100">
            Developed by <span className="font-semibold text-gray-500">Feri</span> · SD Islam Al-Fakhir
          </footer>
        </main>
      </div>
    </>
  );
}
