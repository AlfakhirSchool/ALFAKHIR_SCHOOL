'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

const menuItems = [
  { href: '/dashboard/sd',  icon: '🟢', label: 'Dashboard SD'  },
  { href: '/dashboard/smp', icon: '🔵', label: 'Dashboard SMP' },
  { href: '/dashboard/sma', icon: '🟣', label: 'Dashboard SMA' },
  { href: '/siswa', icon: '👨‍🎓', label: 'Siswa' },
  { href: '/guru', icon: '👨‍🏫', label: 'Guru' },
  { href: '/kelas', icon: '🏫', label: 'Kelas' },
  { href: '/mata-pelajaran', icon: '📚', label: 'Mata Pelajaran' },
  { href: '/jadwal', icon: '📅', label: 'Jadwal' },
  { href: '/absensi', icon: '✅', label: 'Absensi' },
  { href: '/nilai', icon: '📝', label: 'Nilai' },
  { href: '/pembayaran', icon: '💰', label: 'Pembayaran' },
  { href: '/jurnal-guru', icon: '📓', label: 'Jurnal Guru' },
  { href: '/laporan', icon: '📄', label: 'Laporan' },
  { href: '/audit-log', icon: '🔍', label: 'Audit Log' },
  { href: '/settings', icon: '⚙️', label: 'Pengaturan' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-[#1A2332] text-white flex flex-col min-h-screen fixed left-0 top-0 z-40">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <p className="font-bold text-sm">Al Fakhir School</p>
            <p className="text-xs text-gray-400">Admin Control Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
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
                      ? 'bg-[#3B7FD1] text-white font-medium'
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

      {/* Logout */}
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
