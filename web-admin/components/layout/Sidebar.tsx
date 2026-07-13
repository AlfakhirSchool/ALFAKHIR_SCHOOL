'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, SchoolLevel } from '@/store/authStore';
import { useRouter } from 'next/navigation';

const masterMenu = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/siswa', icon: '👨‍🎓', label: 'Siswa' },
  { href: '/guru', icon: '👨‍🏫', label: 'Guru' },
  { href: '/kelas', icon: '🏫', label: 'Kelas' },
  { href: '/mata-pelajaran', icon: '📚', label: 'Mata Pelajaran' },
  { href: '/jadwal', icon: '📅', label: 'Jadwal' },
  { href: '/absensi-gerbang', icon: '🏫', label: 'Absensi Gerbang' },
  { href: '/rfid-registrasi', icon: '💳', label: 'Registrasi RFID' },
  { href: '/absensi', icon: '✅', label: 'Absensi Kelas' },
  { href: '/nilai', icon: '📝', label: 'Nilai' },
  { href: '/pembayaran', icon: '💰', label: 'Pembayaran' },
  { href: '/jurnal-guru', icon: '📓', label: 'Jurnal Guru' },
  { href: '/laporan', icon: '📄', label: 'Laporan' },
  { href: '/users', icon: '👥', label: 'Kelola Akun' },
  { href: '/audit-log', icon: '🔍', label: 'Audit Log' },
  { href: '/settings', icon: '⚙️', label: 'Pengaturan' },
];

const levelMenu = (level: string) => [
  { href: `/dashboard/${level.toLowerCase()}`, icon: '📊', label: `Dashboard ${level}` },
  { href: '/siswa', icon: '👨‍🎓', label: 'Siswa' },
  { href: '/guru', icon: '👨‍🏫', label: 'Guru' },
  { href: '/kelas', icon: '🏫', label: 'Kelas' },
  { href: '/jadwal', icon: '📅', label: 'Jadwal' },
  { href: '/absensi-gerbang', icon: '🏫', label: 'Absensi Gerbang' },
  { href: '/rfid-registrasi', icon: '💳', label: 'Registrasi RFID' },
  { href: '/absensi', icon: '✅', label: 'Absensi Kelas' },
  { href: '/nilai', icon: '📝', label: 'Nilai' },
  { href: '/laporan', icon: '📄', label: 'Laporan' },
  { href: '/users', icon: '👥', label: 'Kelola Akun' },
];

const LEVEL_COLOR: Record<string, string> = {
  SD:  '#F97316',
  SMP: '#1B8B87',
  SMA: '#3B82F6',
};

const LEVEL_LOGO: Record<string, string> = {
  SD:  '/logo-sd.png',
  SMP: '/logo-smp.png',
  SMA: '/logo-sma.png',
};

const LEVEL_NAME: Record<string, string> = {
  SD:  'SD Islam Modern Al-Fakhir',
  SMP: 'SMP Islam Modern Al-Fakhir',
  SMA: 'SMA Islam Modern Al-Fakhir',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const router = useRouter();
  const level = user?.school_level as SchoolLevel;

  const menuItems = level ? levelMenu(level) : masterMenu;
  const accentColor = level ? LEVEL_COLOR[level] : '#3B7FD1';
  const logo = level ? (LEVEL_LOGO[level] ?? '/logo-master.png') : '/logo-master.png';
  const schoolName = level ? (LEVEL_NAME[level] ?? 'Al Fakhir School') : 'Al Fakhir School';

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
            <img src={logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{schoolName}</p>
            <p className="text-xs" style={{ color: accentColor }}>
              {level ? `Admin ${level}` : 'Admin Control Center'}
            </p>
          </div>
        </div>
        {level && (
          <div className="mt-3 px-2 py-1 rounded-lg text-xs font-bold text-white text-center" style={{ backgroundColor: accentColor }}>
            Dashboard {level}
          </div>
        )}
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
                    active ? 'text-white font-medium' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                  style={active ? { backgroundColor: accentColor } : {}}
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
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-gray-400 truncate">{user?.nama}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
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
