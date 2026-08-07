'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, CalendarCheck, BookOpen, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { href: '/',           icon: Home,          label: 'Beranda' },
  { href: '/tagihan',    icon: CreditCard,    label: 'Tagihan' },
  { href: '/kehadiran',  icon: CalendarCheck, label: 'Kehadiran' },
  { href: '/tugas',      icon: BookOpen,      label: 'Tugas' },
  { href: '/profil',     icon: User,          label: 'Profil' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const accent = user?.role === 'ortu' ? '#F97316' : '#F97316';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-pb">
      <div className="flex">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
              style={{ color: active ? accent : '#9CA3AF' }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
