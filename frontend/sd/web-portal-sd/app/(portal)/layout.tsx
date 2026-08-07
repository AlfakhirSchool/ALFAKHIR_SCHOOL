'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import BottomNav from '@/components/layout/BottomNav';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/login');
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) return null;

  const roleLabel = user?.role === 'ortu' ? 'Orang Tua' : 'Siswa';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top header */}
      <header className="bg-[#F97316] text-white px-4 pt-safe-top pb-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <img src="/logo-sd.png" alt="Logo SD" className="w-8 h-8 object-contain" />
            <div>
              <p className="font-semibold text-sm leading-tight">SD Al-Fakhir</p>
              <p className="text-orange-200 text-[10px]">Portal {roleLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium truncate max-w-[120px]">{user?.nama}</p>
            <p className="text-orange-200 text-[10px] capitalize">{user?.role}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
