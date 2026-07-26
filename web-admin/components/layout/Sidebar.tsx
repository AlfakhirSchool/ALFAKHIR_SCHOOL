'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore, SchoolLevel } from '@/store/authStore';
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen, Calendar,
  DoorOpen, CreditCard, ClipboardCheck, FileText, Wallet, BookMarked,
  BarChart3, UserCog, Search, Settings, Bell, MessageSquare,
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
  { href: '/feedback',        icon: <MessageSquare size={18} />,    label: 'Feedback & Saran' },
  { href: '/settings',        icon: <Settings size={18} />,         label: 'Pengaturan' },
];

const levelMenu = (level: string): MenuItem[] => [
  { href: `/dashboard/${level.toLowerCase()}`, icon: <LayoutDashboard size={18} />, label: `Dashboard ${level}` },
  { href: '/siswa',           icon: <GraduationCap size={18} />,    label: 'Siswa' },
  { href: '/guru',            icon: <Users size={18} />,            label: 'Guru' },
  { href: '/kelas',           icon: <School size={18} />,           label: 'Kelas' },
  { href: '/mata-pelajaran',  icon: <BookOpen size={18} />,         label: 'Mata Pelajaran' },
  { href: '/jadwal',          icon: <Calendar size={18} />,         label: 'Jadwal' },
  { href: '/absensi-gerbang', icon: <DoorOpen size={18} />,         label: 'Absensi Gerbang' },
  { href: '/rfid-registrasi', icon: <CreditCard size={18} />,       label: 'Registrasi RFID' },
  { href: '/absensi',         icon: <ClipboardCheck size={18} />,   label: 'Absensi Kelas' },
  { href: '/rekap-absensi',  icon: <BarChart3 size={18} />,        label: 'Rekap Absensi' },
  { href: '/jurnal-guru',    icon: <BookMarked size={18} />,       label: 'Jurnal Guru' },
  { href: '/nilai',           icon: <FileText size={18} />,         label: 'Nilai' },
  { href: '/laporan',         icon: <BarChart3 size={18} />,        label: 'Laporan' },
  { href: '/users',           icon: <UserCog size={18} />,          label: 'Kelola Akun' },
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

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const level = user?.school_level as SchoolLevel;

  const menuItems = level ? levelMenu(level) : masterMenu;
  const accentColor = level ? LEVEL_COLOR[level] : '#3B7FD1';
  const logo = level ? (LEVEL_LOGO[level] ?? '/logo.png') : '/logo.png';
  const schoolName = level ? (LEVEL_NAME[level] ?? 'Al Fakhir School') : 'Al Fakhir School';

  return (
    <motion.aside
      className="bg-[#1A2332] text-white flex flex-col h-screen fixed left-0 top-0 z-40 overflow-hidden"
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center gap-2 min-h-[64px]">
        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
          <img src={logo} alt="Logo" className="w-full h-full object-contain" style={{ mixBlendMode: 'screen' }} />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <p className="font-bold text-sm leading-tight whitespace-nowrap">{schoolName}</p>
            <p className="text-xs whitespace-nowrap" style={{ color: accentColor }}>
              {level ? `Admin ${level}` : 'Admin Control Center'}
            </p>
          </motion.div>
        )}
        <button
          onClick={onToggle}
          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <path d="M11 19l-7-7 7-7" />
            <path d="M19 19l-7-7 7-7" />
          </motion.svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pb-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <motion.ul
          className="space-y-0.5"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
        >
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <motion.li key={item.href}
                variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    active ? 'text-white font-medium shadow-sm' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                  style={active ? { backgroundColor: accentColor } : {}}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

    </motion.aside>
  );
}
