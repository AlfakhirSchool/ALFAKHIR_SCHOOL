'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, BookOpen, User } from 'lucide-react';

const navItems = [
  { href: '/',              icon: Home,      label: 'Beranda'  },
  { href: '/tagihan',       icon: CreditCard, label: 'Tagihan' },
  { href: '/ruang-kelas',   icon: BookOpen,  label: 'Kelas'    },
  { href: '/profil',        icon: User,      label: 'Profil'   },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 bg-white border-t border-[#dec1b1] h-[72px]">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <Link key={href} href={href}
            className="relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all active:scale-90"
            style={{ color: active ? '#994700' : '#565e74' }}>
            {active && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-1 bg-[#f47b20] rounded-b-full" />
            )}
            <Icon size={24} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
