'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, ClipboardList, BookOpen, FileText, BarChart3, BookMarked, Users, Calendar, Settings, MessageSquare } from 'lucide-react';

const menuItems = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/absensi',       icon: ClipboardList,   label: 'Absensi' },
  { href: '/nilai',         icon: BookOpen,         label: 'Input Nilai' },
  { href: '/rapor',         icon: FileText,         label: 'Rapor Kelas' },
  { href: '/rekap-absensi', icon: BarChart3,        label: 'Rekap Absensi' },
  { href: '/jurnal',        icon: BookMarked,       label: 'Jurnal Guru' },
  { href: '/kelas',         icon: Users,            label: 'Kelas Saya' },
  { href: '/jadwal',        icon: Calendar,         label: 'Jadwal' },
  { href: '/feedback',      icon: MessageSquare,    label: 'Saran & Pertanyaan' },
  { href: '/settings',      icon: Settings,         label: 'Pengaturan' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0 },
};

function getSchoolLogo(levels: string[] = []): string {
  if (levels.length !== 1) return '/logo.png';
  if (levels[0] === 'SD')  return '/logo-sd.webp';
  if (levels[0] === 'SMP') return '/logo-smp.png';
  if (levels[0] === 'SMA') return '/logo-sma.png';
  return '/logo.png';
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
  const picUrl = user?.profile_pic
    ? user.profile_pic.startsWith('http') ? user.profile_pic : `${apiBase}${user.profile_pic}`
    : null;
  const schoolLogo = getSchoolLogo(user?.school_levels);

  return (
    <aside className="w-64 bg-[#1A2332] text-white flex flex-col min-h-screen fixed left-0 top-0 z-40">
      <motion.div
        className="p-5 border-b border-white/10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
            <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <p className="font-bold text-sm">Al Fakhir School</p>
            <p className="text-xs text-gray-400">Guru Dashboard</p>
          </div>
        </div>
      </motion.div>

      {user && (
        <motion.div
          className="px-5 py-4 border-b border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold border-2 border-white/30 shadow bg-[#1B8B87]">
              {picUrl
                ? <img src={picUrl} alt="" className="w-full h-full object-cover" />
                : user.nama?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium truncate">{user.nama}</p>
              <p className="text-xs text-gray-400">Guru</p>
            </div>
          </div>
        </motion.div>
      )}

      <nav className="flex-1 p-4 overflow-y-auto">
        <motion.ul className="space-y-1" variants={container} initial="hidden" animate="show">
          {menuItems.map((menuItem) => {
            const active = pathname === menuItem.href || pathname.startsWith(menuItem.href + '/');
            const Icon = menuItem.icon;
            return (
              <motion.li key={menuItem.href} variants={item} transition={{ duration: 0.3, ease: 'easeOut' }}>
                <Link
                  href={menuItem.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-[#1B8B87] text-white font-medium'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {menuItem.label}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>
    </aside>
  );
}
