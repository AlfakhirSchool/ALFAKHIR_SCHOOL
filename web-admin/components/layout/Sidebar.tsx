'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, SchoolLevel } from '@/store/authStore';
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen, Calendar,
  DoorOpen, CreditCard, ClipboardCheck, FileText, Wallet, BookMarked,
  BarChart3, UserCog, Search, Settings, Bell,
} from 'lucide-react';

type MenuItem = { href: string; icon: React.ReactNode; label: string };

const masterMenu: MenuItem[] = [
  { href: '/dashboard',       icon: <LayoutDashboard size={18} />,  label: 'Dashboard' },
  { href: '/siswa',           icon: <GraduationCap size={18} />,    label: 'Siswa' },
  { href: '/guru',            icon: <Users size={18} />,            label: 'Guru' },
  { href: '/kelas',           icon: <School size={18} />,           label: 'Kelas' },
  { href: '/mata-pelajaran',  icon: <BookOpen size={18} />,         label: 'Mata Pelajaran' },
  { href: '/jadwal',          icon: <Calendar size={18} />,         label: 'Jadwal' },
  { href: '/absensi-gerbang', icon: <DoorOpen size={18} />,         label: 'Absensi Gerbang' },
  { href: '/rfid-registrasi', icon: <CreditCard size={18} />,       label: 'Registrasi RFID' },
  { href: '/absensi',         icon: <ClipboardCheck size={18} />,   label: 'Absensi Kelas' },
  { href: '/rekap-absensi',  icon: <BarChart3 size={18} />,        label: 'Rekap Absensi' },
  { href: '/nilai',           icon: <FileText size={18} />,         label: 'Nilai' },
  { href: '/pembayaran',      icon: <Wallet size={18} />,           label: 'Pembayaran' },
  { href: '/jurnal-guru',     icon: <BookMarked size={18} />,       label: 'Jurnal Guru' },
  { href: '/laporan',         icon: <BarChart3 size={18} />,        label: 'Laporan' },
  { href: '/users',           icon: <UserCog size={18} />,          label: 'Kelola Akun' },
  { href: '/pending-changes', icon: <Bell size={18} />,             label: 'Permintaan Akun' },
  { href: '/audit-log',       icon: <Search size={18} />,           label: 'Audit Log' },
  { href: '/settings',        icon: <Settings size={18} />,         label: 'Pengaturan' },
];

const levelMenu = (level: string): MenuItem[] => [
  { href: `/dashboard/${level.toLowerCase()}`, icon: <LayoutDashboard size={18} />, label: `Dashboard ${level}` },
  { href: '/siswa',           icon: <GraduationCap size={18} />,    label: 'Siswa' },
  { href: '/guru',            icon: <Users size={18} />,            label: 'Guru' },
  { href: '/kelas',           icon: <School size={18} />,           label: 'Kelas' },
  { href: '/jadwal',          icon: <Calendar size={18} />,         label: 'Jadwal' },
  { href: '/absensi-gerbang', icon: <DoorOpen size={18} />,         label: 'Absensi Gerbang' },
  { href: '/rfid-registrasi', icon: <CreditCard size={18} />,       label: 'Registrasi RFID' },
  { href: '/absensi',         icon: <ClipboardCheck size={18} />,   label: 'Absensi Kelas' },
  { href: '/rekap-absensi',  icon: <BarChart3 size={18} />,        label: 'Rekap Absensi' },
  { href: '/jurnal-guru',    icon: <BookMarked size={18} />,       label: 'Jurnal Guru' },
  { href: '/nilai',           icon: <FileText size={18} />,         label: 'Nilai' },
  { href: '/laporan',         icon: <BarChart3 size={18} />,        label: 'Laporan' },
  { href: '/users',           icon: <UserCog size={18} />,          label: 'Kelola Akun' },
  // Settings sengaja tidak ada di level menu — hanya master admin
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
  const { user } = useAuthStore();
  const level = user?.school_level as SchoolLevel;

  const menuItems = level ? levelMenu(level) : masterMenu;
  const accentColor = level ? LEVEL_COLOR[level] : '#3B7FD1';
  const logo = level ? (LEVEL_LOGO[level] ?? '/logo-master.png') : '/logo-master.png';
  const schoolName = level ? (LEVEL_NAME[level] ?? 'Al Fakhir School') : 'Al Fakhir School';

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
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    active ? 'text-white font-medium shadow-sm' : 'text-gray-400 hover:bg-white/8 hover:text-white'
                  }`}
                  style={active ? { backgroundColor: accentColor } : {}}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

    </aside>
  );
}
