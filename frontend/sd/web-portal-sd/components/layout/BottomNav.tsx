'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, BookOpen, ClipboardList, User } from 'lucide-react';

const navItems = [
  { href: '/',          icon: Home,          label: 'Beranda'  },
  { href: '/tagihan',   icon: CreditCard,    label: 'Tagihan'  },
  { href: '/materi',    icon: BookOpen,      label: 'Mapel'    },
  { href: '/tugas',     icon: ClipboardList, label: 'Tugas'    },
  { href: '/profil',    icon: User,          label: 'Profil'   },
];

const ACCENT = '#F97316';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5">
      <nav className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100">
        <div className="flex">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors"
                style={{ color: active ? ACCENT : '#9CA3AF' }}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
