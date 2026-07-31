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
  PanelLeftClose, PanelLeftOpen, ClipboardList, ChevronRight,
} from 'lucide-react';

type MenuItem  = { href: string; icon: React.ReactNode; label: string };
type MenuGroup = { label: string; icon: React.ReactNode; items: MenuItem[]; color?: string };
type SidebarEntry = MenuItem | MenuGroup;

function isGroup(e: SidebarEntry): e is MenuGroup {
  return 'items' in e;
}

const pewawancaraMenu: MenuItem[] = [
  { href: '/dashboard/pewawancara', icon: <LayoutDashboard size={16} />, label: 'Dashboard Saya' },
  { href: '/interviewer',           icon: <ClipboardList size={16} />,   label: 'Daftar Kandidat' },
  { href: '/interviewer/sd',        icon: <GraduationCap size={16} />,   label: 'Unit SD' },
  { href: '/interviewer/smp',       icon: <GraduationCap size={16} />,   label: 'Unit SMP' },
  { href: '/observasi/catatan',     icon: <FileText size={16} />,        label: 'Semua Catatan' },
  { href: '/settings',              icon: <Settings size={16} />,        label: 'Pengaturan' },
];

const masterMenu: SidebarEntry[] = [
  { href: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  {
    label: 'Akademik', icon: <GraduationCap size={14} />, color: '#6366F1',
    items: [
      { href: '/siswa',          icon: <GraduationCap size={15} />, label: 'Siswa' },
      { href: '/guru',           icon: <Users size={15} />,         label: 'Guru' },
      { href: '/kelas',          icon: <School size={15} />,        label: 'Kelas' },
      { href: '/mata-pelajaran', icon: <BookOpen size={15} />,      label: 'Mata Pelajaran' },
      { href: '/jadwal',         icon: <Calendar size={15} />,      label: 'Jadwal' },
    ],
  },
  {
    label: 'Kehadiran', icon: <ClipboardCheck size={14} />, color: '#10B981',
    items: [
      { href: '/absensi-gerbang', icon: <DoorOpen size={15} />,       label: 'Absensi Gerbang' },
      { href: '/rfid-registrasi', icon: <CreditCard size={15} />,     label: 'Registrasi RFID' },
      { href: '/absensi',         icon: <ClipboardCheck size={15} />, label: 'Absensi Kelas' },
      { href: '/rekap-absensi',   icon: <BarChart3 size={15} />,      label: 'Rekap Absensi' },
    ],
  },
  {
    label: 'Keuangan & Nilai', icon: <Wallet size={14} />, color: '#F59E0B',
    items: [
      { href: '/nilai',       icon: <FileText size={15} />,   label: 'Nilai' },
      { href: '/pembayaran',  icon: <Wallet size={15} />,     label: 'Pembayaran' },
      { href: '/jurnal-guru', icon: <BookMarked size={15} />, label: 'Jurnal Guru' },
      { href: '/laporan',     icon: <BarChart3 size={15} />,  label: 'Laporan' },
    ],
  },
  {
    label: 'PPDB', icon: <ClipboardList size={14} />, color: '#14B8A6',
    items: [
      { href: '/observasi',         icon: <ClipboardList size={15} />, label: 'Penerimaan Siswa' },
      { href: '/observasi/catatan', icon: <FileText size={15} />,      label: 'Semua Catatan' },
      { href: '/interviewer',       icon: <ClipboardList size={15} />, label: 'Monitor Pewawancara' },
    ],
  },
  {
    label: 'Sistem', icon: <Settings size={14} />, color: '#8B5CF6',
    items: [
      { href: '/users',           icon: <UserCog size={15} />,      label: 'Kelola Akun' },
      { href: '/pending-changes', icon: <Bell size={15} />,          label: 'Permintaan Akun' },
      { href: '/audit-log',       icon: <Search size={15} />,        label: 'Audit Log' },
      { href: '/feedback',        icon: <MessageSquare size={15} />, label: 'Feedback & Saran' },
      { href: '/settings',        icon: <Settings size={15} />,      label: 'Pengaturan' },
    ],
  },
];

const levelMenu = (level: string): SidebarEntry[] => [
  { href: `/dashboard/${level.toLowerCase()}`, icon: <LayoutDashboard size={16} />, label: `Dashboard ${level}` },
  {
    label: 'Akademik', icon: <GraduationCap size={14} />, color: '#6366F1',
    items: [
      { href: '/siswa',          icon: <GraduationCap size={15} />, label: 'Siswa' },
      { href: '/guru',           icon: <Users size={15} />,         label: 'Guru' },
      { href: '/kelas',          icon: <School size={15} />,        label: 'Kelas' },
      { href: '/mata-pelajaran', icon: <BookOpen size={15} />,      label: 'Mata Pelajaran' },
      { href: '/jadwal',         icon: <Calendar size={15} />,      label: 'Jadwal' },
    ],
  },
  {
    label: 'Kehadiran', icon: <ClipboardCheck size={14} />, color: '#10B981',
    items: [
      { href: '/absensi-gerbang', icon: <DoorOpen size={15} />,       label: 'Absensi Gerbang' },
      { href: '/rfid-registrasi', icon: <CreditCard size={15} />,     label: 'Registrasi RFID' },
      { href: '/absensi',         icon: <ClipboardCheck size={15} />, label: 'Absensi Kelas' },
      { href: '/rekap-absensi',   icon: <BarChart3 size={15} />,      label: 'Rekap Absensi' },
    ],
  },
  {
    label: 'Keuangan & Nilai', icon: <Wallet size={14} />, color: '#F59E0B',
    items: [
      { href: '/nilai',       icon: <FileText size={15} />,   label: 'Nilai' },
      { href: '/pembayaran',  icon: <Wallet size={15} />,     label: 'Pembayaran' },
      { href: '/jurnal-guru', icon: <BookMarked size={15} />, label: 'Jurnal Guru' },
      { href: '/laporan',     icon: <BarChart3 size={15} />,  label: 'Laporan' },
    ],
  },
  {
    label: 'PPDB', icon: <ClipboardList size={14} />, color: '#14B8A6',
    items: [
      { href: '/observasi',         icon: <ClipboardList size={15} />, label: 'Penerimaan Siswa' },
      { href: '/observasi/catatan', icon: <FileText size={15} />,      label: 'Semua Catatan' },
      { href: '/interviewer',       icon: <ClipboardList size={15} />, label: 'Pewawancara' },
    ],
  },
  { href: '/users', icon: <UserCog size={16} />, label: 'Kelola Akun' },
];

const LEVEL_COLOR: Record<string, string> = { SD: '#FB923C', SMP: '#2DD4BF', SMA: '#60A5FA' };
const LEVEL_LOGO:  Record<string, string> = { SD: '/logo-sd.png', SMP: '/logo-smp.png', SMA: '/logo-sma.png' };
const LEVEL_NAME:  Record<string, string> = {
  SD:  'SD Islam Al-Fakhir',
  SMP: 'SMP Islam Al-Fakhir',
  SMA: 'SMA Islam Al-Fakhir',
};

function GroupItem({
  group, accentColor, collapsed,
}: {
  group: MenuGroup; accentColor: string; collapsed: boolean;
}) {
  const pathname = usePathname();
  const hasActive = group.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));
  const [open, setOpen] = useState(hasActive);
  const groupColor = group.color ?? accentColor;

  if (collapsed) {
    const activeItem = group.items.find(i => pathname === i.href || pathname.startsWith(i.href + '/'));
    return (
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-xl mx-auto my-0.5 cursor-pointer transition-all duration-150 ${
          hasActive ? 'text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/10'
        }`}
        style={hasActive ? { backgroundColor: groupColor, boxShadow: `0 4px 12px ${groupColor}40` } : {}}
        title={group.label}
      >
        {activeItem ? activeItem.icon : group.icon}
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150 ${
          hasActive ? 'font-semibold' : 'text-slate-500 hover:text-slate-300 font-medium'
        }`}
        style={hasActive ? { color: groupColor } : {}}
      >
        <span
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
          style={hasActive
            ? { backgroundColor: groupColor + '20', color: groupColor }
            : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#64748b' }}
        >
          {group.icon}
        </span>
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight
          size={13}
          className={`flex-shrink-0 text-slate-600 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-2 pl-2 border-l-2 mt-0.5 space-y-0.5 pb-1" style={{ borderColor: groupColor + '30' }}>
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                      active
                        ? 'font-medium text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/8'
                    }`}
                    style={active ? {
                      backgroundColor: groupColor + '20',
                      color: groupColor,
                      boxShadow: `inset 0 0 0 1px ${groupColor}30`,
                    } : {}}
                  >
                    <span
                      className={`flex-shrink-0 transition-colors duration-150 ${active ? '' : 'text-slate-600'}`}
                      style={active ? { color: groupColor } : {}}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: groupColor }} />
                    )}
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

  const accentColor = isPewawancara ? '#14B8A6' : level ? LEVEL_COLOR[level] : '#60A5FA';
  const logo       = level ? (LEVEL_LOGO[level] ?? '/logo.png') : '/logo.png';
  const schoolName = level ? (LEVEL_NAME[level] ?? 'Al Fakhir School') : 'Al Fakhir School';
  const subtitle   = isPewawancara ? 'Portal Pewawancara' : level ? `Admin ${level}` : 'Admin Control Center';

  return (
    <motion.aside
      className="flex flex-col h-screen fixed left-0 top-0 z-40 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #111827 100%)' }}
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full flex-shrink-0" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}00)` }} />

      {/* Header */}
      <div className="border-b border-white/5 min-h-[68px] flex items-center flex-shrink-0">
        {collapsed ? (
          <div className="w-full flex flex-col items-center gap-2 py-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shadow-inner">
              <img src={logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <button
              onClick={onToggle}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              title="Buka sidebar"
            >
              <PanelLeftOpen size={15} />
            </button>
          </div>
        ) : (
          <div className="px-3 w-full flex items-center gap-3">
            <div
              className="w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`, border: `1px solid ${accentColor}30` }}
            >
              <img src={logo} alt="Logo" className="w-9 h-9 object-contain" />
            </div>
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden min-w-0"
            >
              <p className="font-bold text-[13px] leading-tight text-white truncate">{schoolName}</p>
              <p className="text-[11px] font-medium mt-0.5 truncate" style={{ color: accentColor }}>{subtitle}</p>
            </motion.div>
            <button
              onClick={onToggle}
              className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              title="Tutup sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pt-2 pb-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="space-y-0.5">
          {entries.map((entry, i) => {
            if (isGroup(entry)) {
              return (
                <li key={i}>
                  {collapsed
                    ? <GroupItem group={entry} accentColor={accentColor} collapsed />
                    : <GroupItem group={entry} accentColor={accentColor} collapsed={false} />
                  }
                </li>
              );
            }
            const item = entry as MenuItem;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150 ${
                    active ? 'text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-white/8'
                  }`}
                  style={active ? {
                    backgroundColor: accentColor + '20',
                    color: accentColor,
                    boxShadow: `inset 0 0 0 1px ${accentColor}30`,
                  } : {}}
                >
                  <span
                    className="flex-shrink-0"
                    style={active ? { color: accentColor } : {}}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — user info */}
      {!collapsed && user && (
        <div className="px-3 py-3 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: accentColor + '40', color: accentColor }}
            >
              {(user.nama || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user.nama || user.email}</p>
              <p className="text-[10px] text-slate-600 capitalize truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
