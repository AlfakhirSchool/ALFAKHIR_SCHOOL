'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

const menuItems = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/absensi', icon: '📋', label: 'Absensi' },
  { href: '/nilai', icon: '📝', label: 'Input Nilai' },
  { href: '/rapor', icon: '📄', label: 'Rapor Kelas' },
  { href: '/rekap-absensi', icon: '📊', label: 'Rekap Absensi' },
  { href: '/jurnal', icon: '📓', label: 'Jurnal Guru' },
  { href: '/kelas', icon: '👥', label: 'Kelas Saya' },
  { href: '/jadwal', icon: '📅', label: 'Jadwal' },
  { href: '/settings', icon: '⚙️', label: 'Pengaturan' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-[#1A2332] text-white flex flex-col min-h-screen fixed left-0 top-0 z-40">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <p className="font-bold text-sm">Al Fakhir School</p>
            <p className="text-xs text-gray-400">Guru Dashboard</p>
          </div>
        </div>
      </div>

      {user && (
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B8B87]/30 rounded-full flex items-center justify-center text-[#1B8B87] font-bold">
              {user.nama?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium truncate">{user.nama}</p>
              <p className="text-xs text-gray-400">Guru</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-[#1B8B87] text-white font-medium'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-red-500/20 hover:text-red-300 transition-colors"
        >
          <span>🚪</span> Keluar
        </button>
      </div>
    </aside>
  );
}
