'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, ClipboardList, ClipboardCheck, BookOpen, FileText,
  BarChart3, BookMarked, Users, Calendar, Settings, MessageSquare,
  PanelLeftClose, PanelLeftOpen, ChevronRight,
} from 'lucide-react';

type MenuItem  = { href: string; icon: React.ReactNode; label: string };
type MenuGroup = { label: string; icon: React.ReactNode; items: MenuItem[]; color: string };
type Entry = MenuItem | MenuGroup;

function isGroup(e: Entry): e is MenuGroup { return 'items' in e; }

const ACCENT = '#1B8B87';

const menuEntries: Entry[] = [
  { href: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  {
    label: 'Kehadiran', icon: <ClipboardCheck size={14} />, color: '#10B981',
    items: [
      { href: '/absensi',       icon: <ClipboardList size={15} />,  label: 'Absensi' },
      { href: '/absensi-kelas', icon: <ClipboardCheck size={15} />, label: 'Absensi Kelas' },
      { href: '/rekap-absensi', icon: <BarChart3 size={15} />,      label: 'Rekap Absensi' },
    ],
  },
  {
    label: 'Akademik', icon: <BookOpen size={14} />, color: '#6366F1',
    items: [
      { href: '/nilai',  icon: <BookOpen size={15} />,   label: 'Input Nilai' },
      { href: '/rapor',  icon: <FileText size={15} />,   label: 'Rapor Kelas' },
      { href: '/jurnal', icon: <BookMarked size={15} />, label: 'Jurnal Guru' },
      { href: '/kelas',  icon: <Users size={15} />,      label: 'Kelas Saya' },
      { href: '/jadwal', icon: <Calendar size={15} />,   label: 'Jadwal' },
    ],
  },
  { href: '/feedback', icon: <MessageSquare size={16} />, label: 'Saran & Pertanyaan' },
];

function GroupItem({ group, collapsed }: { group: MenuGroup; collapsed: boolean }) {
  const pathname = usePathname();
  const hasActive = group.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));
  const [open, setOpen] = useState(hasActive);

  if (collapsed) {
    return (
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-xl mx-auto my-0.5 cursor-pointer transition-all duration-150 ${
          hasActive ? 'text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={hasActive ? { backgroundColor: group.color, boxShadow: `0 4px 12px ${group.color}40` } : {}}
        title={group.label}
      >
        {group.icon}
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-150 ${
          hasActive ? '' : 'text-gray-900 hover:text-black hover:bg-gray-100'
        }`}
        style={hasActive ? { color: group.color } : {}}
      >
        <span
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md"
          style={hasActive ? { backgroundColor: group.color + '15', color: group.color } : { color: '#374151' }}
        >
          {group.icon}
        </span>
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight
          size={12}
          className={`flex-shrink-0 text-gray-600 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
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
            <div className="ml-2 pl-2 border-l-2 mt-0.5 space-y-0.5 pb-1" style={{ borderColor: group.color + '40' }}>
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                      active ? 'font-semibold' : 'text-gray-900 hover:text-black hover:bg-gray-100'
                    }`}
                    style={active ? { backgroundColor: group.color + '12', color: group.color } : {}}
                  >
                    <span style={active ? { color: group.color } : { color: '#374151' }}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />}
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

function getSchoolLogo(levels: string[] = []): string {
  if (levels.length !== 1) return '/logo.png';
  if (levels[0] === 'SD')  return '/logo-sd.webp';
  if (levels[0] === 'SMP') return '/logo-smp.png';
  if (levels[0] === 'SMA') return '/logo-sma.png';
  return '/logo.png';
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
  const picUrl = user?.profile_pic
    ? user.profile_pic.startsWith('http') ? user.profile_pic : `${apiBase}${user.profile_pic}`
    : null;
  const schoolLogo = getSchoolLogo(user?.school_levels);

  return (
    <motion.aside
      className="bg-white text-gray-900 flex flex-col min-h-screen fixed left-0 top-0 z-40 overflow-hidden"
      style={{ borderRight: '1px solid #e2e8f0' }}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Accent line */}
      <div className="h-0.5 w-full flex-shrink-0" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}00)` }} />

      {/* Header */}
      <div className="border-b border-slate-100 min-h-[64px] flex items-center flex-shrink-0">
        {collapsed ? (
          <div className="w-full flex flex-col items-center gap-2 py-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
              <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <button onClick={onToggle} className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 transition-colors">
              <PanelLeftOpen size={15} />
            </button>
          </div>
        ) : (
          <div className="px-3 w-full flex items-center gap-2">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center">
              <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-[13px] text-gray-900 truncate">Al Fakhir School</p>
              <p className="text-[11px] font-medium truncate" style={{ color: ACCENT }}>Guru Dashboard</p>
            </div>
            <button onClick={onToggle} className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 transition-colors">
              <PanelLeftClose size={15} />
            </button>
          </div>
        )}
      </div>

      {/* User profile */}
      {user && !collapsed && (
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
          <div
            className="w-9 h-9 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: ACCENT }}
          >
            {picUrl
              ? <img src={picUrl} alt="" className="w-full h-full object-cover" />
              : user.nama?.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.nama}</p>
            <p className="text-[11px] text-gray-500">Guru</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 pt-2 pb-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="space-y-0.5">
          {menuEntries.map((entry, i) => {
            if (isGroup(entry)) {
              return <li key={i}><GroupItem group={entry} collapsed={collapsed} /></li>;
            }
            const mItem = entry as MenuItem;
            const active = pathname === mItem.href || pathname.startsWith(mItem.href + '/');
            return (
              <li key={mItem.href}>
                <Link
                  href={mItem.href}
                  title={collapsed ? mItem.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150 ${
                    active ? 'font-semibold' : 'text-gray-900 hover:text-black hover:bg-gray-100'
                  }`}
                  style={active ? { backgroundColor: ACCENT + '12', color: ACCENT } : {}}
                >
                  <span style={active ? { color: ACCENT } : { color: '#374151' }}>{mItem.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{mItem.label}</span>
                      {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} />}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </motion.aside>
  );
}
