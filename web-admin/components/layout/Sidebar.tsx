'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, SchoolLevel } from '@/store/authStore';
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen, Calendar,
  DoorOpen, CreditCard, ClipboardCheck, FileText, Wallet, BookMarked,
  BarChart3, UserCog, Search, Settings, Bell, MessageSquare,
  PanelLeftClose, PanelLeftOpen, ClipboardList, ChevronDown,
} from 'lucide-react';

type MenuItem = { href: string; icon: React.ReactNode; label: string };
type MenuGroup = { label: string; icon: React.ReactNode; items: MenuItem[] };
type SidebarEntry = MenuItem | MenuGroup;

function isGroup(e: SidebarEntry): e is MenuGroup {
  return 'items' in e;
}

const pewawancaraMenu: MenuItem[] = [
  { href: '/dashboard/pewawancara', icon: <LayoutDashboard size={18} />, label: 'Dashboard Saya' },
  { href: '/interviewer',           icon: <ClipboardList size={18} />,   label: 'Daftar Kandidat' },
  { href: '/interviewer/sd',        icon: <GraduationCap size={18} />,   label: 'Unit SD' },
  { href: '/interviewer/smp',       icon: <GraduationCap size={18} />,   label: 'Unit SMP' },
  { href: '/observasi/catatan',     icon: <FileText size={18} />,        label: 'Semua Catatan' },
  { href: '/settings',              icon: <Settings size={18} />,        label: 'Pengaturan' },
];

const masterMenu: SidebarEntry[] = [
  { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  {
    label: 'Akademik', icon: <GraduationCap size={16} />,
    items: [
      { href: '/siswa',          icon: <GraduationCap size={18} />, label: 'Siswa' },
      { href: '/guru',           icon: <Users size={18} />,         label: 'Guru' },
      { href: '/kelas',          icon: <School size={18} />,        label: 'Kelas' },
      { href: '/mata-pelajaran', icon: <BookOpen size={18} />,      label: 'Mata Pelajaran' },
      { href: '/jadwal',         icon: <Calendar size={18} />,      label: 'Jadwal' },
    ],
  },
  {
    label: 'Kehadiran', icon: <ClipboardCheck size={16} />,
    items: [
      { href: '/absensi-gerbang', icon: <DoorOpen size={18} />,       label: 'Absensi Gerbang' },
      { href: '/rfid-registrasi', icon: <CreditCard size={18} />,     label: 'Registrasi RFID' },
      { href: '/absensi',         icon: <ClipboardCheck size={18} />, label: 'Absensi Kelas' },
      { href: '/rekap-absensi',   icon: <BarChart3 size={18} />,      label: 'Rekap Absensi' },
    ],
  },
  {
    label: 'Keuangan & Nilai', icon: <Wallet size={16} />,
    items: [
      { href: '/nilai',       icon: <FileText size={18} />,   label: 'Nilai' },
      { href: '/pembayaran',  icon: <Wallet size={18} />,     label: 'Pembayaran' },
      { href: '/jurnal-guru', icon: <BookMarked size={18} />, label: 'Jurnal Guru' },
      { href: '/laporan',     icon: <BarChart3 size={18} />,  label: 'Laporan' },
    ],
  },
  {
    label: 'PPDB', icon: <ClipboardList size={16} />,
    items: [
      { href: '/observasi',         icon: <ClipboardList size={18} />, label: 'Penerimaan Siswa' },
      { href: '/observasi/catatan', icon: <FileText size={18} />,      label: 'Semua Catatan' },
      { href: '/interviewer',       icon: <ClipboardList size={18} />, label: 'Monitor Pewawancara' },
    ],
  },
  {
    label: 'Sistem', icon: <Settings size={16} />,
    items: [
      { href: '/users',           icon: <UserCog size={18} />,      label: 'Kelola Akun' },
      { href: '/pending-changes', icon: <Bell size={18} />,          label: 'Permintaan Akun' },
      { href: '/audit-log',       icon: <Search size={18} />,        label: 'Audit Log' },
      { href: '/feedback',        icon: <MessageSquare size={18} />, label: 'Feedback & Saran' },
      { href: '/settings',        icon: <Settings size={18} />,      label: 'Pengaturan' },
    ],
  },
];

const levelMenu = (level: string): SidebarEntry[] => [
  { href: `/dashboard/${level.toLowerCase()}`, icon: <LayoutDashboard size={18} />, label: `Dashboard ${level}` },
  {
    label: 'Akademik', icon: <GraduationCap size={16} />,
    items: [
      { href: '/siswa',          icon: <GraduationCap size={18} />, label: 'Siswa' },
      { href: '/guru',           icon: <Users size={18} />,         label: 'Guru' },
      { href: '/kelas',          icon: <School size={18} />,        label: 'Kelas' },
      { href: '/mata-pelajaran', icon: <BookOpen size={18} />,      label: 'Mata Pelajaran' },
      { href: '/jadwal',         icon: <Calendar size={18} />,      label: 'Jadwal' },
    ],
  },
  {
    label: 'Kehadiran', icon: <ClipboardCheck size={16} />,
    items: [
      { href: '/absensi-gerbang', icon: <DoorOpen size={18} />,       label: 'Absensi Gerbang' },
      { href: '/rfid-registrasi', icon: <CreditCard size={18} />,     label: 'Registrasi RFID' },
      { href: '/absensi',         icon: <ClipboardCheck size={18} />, label: 'Absensi Kelas' },
      { href: '/rekap-absensi',   icon: <BarChart3 size={18} />,      label: 'Rekap Absensi' },
    ],
  },
  {
    label: 'Keuangan & Nilai', icon: <Wallet size={16} />,
    items: [
      { href: '/nilai',       icon: <FileText size={18} />,   label: 'Nilai' },
      { href: '/pembayaran',  icon: <Wallet size={18} />,     label: 'Pembayaran' },
      { href: '/jurnal-guru', icon: <BookMarked size={18} />, label: 'Jurnal Guru' },
      { href: '/laporan',     icon: <BarChart3 size={18} />,  label: 'Laporan' },
    ],
  },
  {
    label: 'PPDB', icon: <ClipboardList size={16} />,
    items: [
      { href: '/observasi',         icon: <ClipboardList size={18} />, label: 'Penerimaan Siswa' },
      { href: '/observasi/catatan', icon: <FileText size={18} />,      label: 'Semua Catatan' },
      { href: '/interviewer',       icon: <ClipboardList size={18} />, label: 'Pewawancara' },
    ],
  },
  { href: '/users', icon: <UserCog size={18} />, label: 'Kelola Akun' },
];

const LEVEL_COLOR: Record<string, string> = { SD: '#FB923C', SMP: '#2DD4BF', SMA: '#60A5FA' };
const LEVEL_LOGO:  Record<string, string> = { SD: '/logo-sd.png', SMP: '/logo-smp.png', SMA: '/logo-sma.png' };
const LEVEL_NAME:  Record<string, string> = {
  SD:  'SD Islam Modern Al-Fakhir',
  SMP: 'SMP Islam Modern Al-Fakhir',
  SMA: 'SMA Islam Modern Al-Fakhir',
};

function GroupItem({ group, accentColor, collapsed }: { group: MenuGroup; accentColor: string; collapsed: boolean }) {
  const pathname = usePathname();
  const hasActive = group.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));
  const [open, setOpen] = useState(hasActive);

  if (collapsed) {
    // In collapsed mode show first active item icon, or group icon
    const activeItem = group.items.find(i => pathname === i.href || pathname.startsWith(i.href + '/'));
    return (
      <div className="relative group/tip">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg mx-auto my-0.5 ${hasActive ? 'text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'} cursor-pointer`}
          style={hasActive ? { backgroundColor: accentColor } : {}}
          title={group.label}>
          {activeItem ? activeItem.icon : group.icon}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
          hasActive ? 'text-white font-medium' : 'text-gray-400 hover:bg-white/10 hover:text-white'
        }`}
        style={hasActive && !open ? { backgroundColor: accentColor + '33' } : {}}
      >
        <span className="flex-shrink-0 text-gray-500">{group.icon}</span>
        <span className="flex-1 truncate font-medium">{group.label}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-3 pl-3 border-l border-white/10 mt-0.5 space-y-0.5 pb-1">
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      active ? 'text-white font-medium shadow-sm' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                    style={active ? { backgroundColor: accentColor } : {}}>
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const level = user?.school_level as SchoolLevel;

  const isPewawancara = user?.role === 'pewawancara' || user?.role === 'guru';
  const entries: SidebarEntry[] = isPewawancara
    ? pewawancaraMenu
    : level ? levelMenu(level) : masterMenu;

  const accentColor = isPewawancara ? '#1B8B87' : level ? LEVEL_COLOR[level] : '#60A5FA';
  const logo = level ? (LEVEL_LOGO[level] ?? '/logo.png') : '/logo.png';
  const schoolName = level ? (LEVEL_NAME[level] ?? 'Al Fakhir School') : 'Al Fakhir School';
  const subtitle = isPewawancara ? 'Pewawancara PPDB' : level ? `Admin ${level}` : 'Admin Control Center';

  return (
    <motion.aside
      className="bg-[#1A2332] text-white flex flex-col h-screen fixed left-0 top-0 z-40 overflow-hidden"
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="border-b border-white/10 min-h-[64px] flex items-center">
        {collapsed ? (
          <div className="w-full flex flex-col items-center gap-2 py-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/90 flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <button onClick={onToggle}
              className="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Buka sidebar">
              <PanelLeftOpen size={17} />
            </button>
          </div>
        ) : (
          <div className="px-3 w-full flex items-center gap-2">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white/90 flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
              <p className="font-bold text-sm leading-tight whitespace-nowrap">{schoolName}</p>
              <p className="text-xs whitespace-nowrap" style={{ color: accentColor }}>{subtitle}</p>
            </motion.div>
            <button onClick={onToggle}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Tutup sidebar">
              <PanelLeftClose size={17} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pb-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-1">
        <ul className="space-y-0.5">
          {entries.map((entry, i) => {
            if (isGroup(entry)) {
              if (collapsed) return <GroupItem key={i} group={entry} accentColor={accentColor} collapsed />;
              return <GroupItem key={i} group={entry} accentColor={accentColor} collapsed={false} />;
            }
            const item = entry as MenuItem;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link href={item.href} title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    active ? 'text-white font-medium shadow-sm' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                  style={active ? { backgroundColor: accentColor } : {}}>
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </motion.aside>
  );
}
