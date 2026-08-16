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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)] rounded-t-[20px] h-[72px] flex items-center justify-around px-4">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <Link key={href} href={href}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full transition-all active:scale-90"
            style={{ color: active ? '#994700' : '#565e74' }}>
            <Icon size={24} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
