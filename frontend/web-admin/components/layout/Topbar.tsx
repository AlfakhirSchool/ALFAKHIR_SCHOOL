'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
  Bell, ChevronRight, LogOut, Settings, User,
  Shield, ChevronDown, RefreshCw,
} from 'lucide-react';

// ── breadcrumb label map ──────────────────────────────────────────────────────
const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', siswa: 'Siswa', guru: 'Guru', kelas: 'Kelas',
  'mata-pelajaran': 'Mata Pelajaran', jadwal: 'Jadwal',
  absensi: 'Absensi Kelas', 'absensi-gerbang': 'Absensi Gerbang',
  'rfid-registrasi': 'Registrasi RFID', 'rekap-absensi': 'Rekap Absensi',
  nilai: 'Nilai', pembayaran: 'Pembayaran', 'jurnal-guru': 'Jurnal Guru',
  laporan: 'Laporan', observasi: 'PPDB', catatan: 'Semua Catatan',
  interviewer: 'Pewawancara', sd: 'Unit SD', smp: 'Unit SMP', sma: 'Unit SMA',
  users: 'Kelola Akun', 'pending-changes': 'Permintaan Akun',
  'audit-log': 'Audit Log', feedback: 'Feedback', settings: 'Pengaturan',
  pewawancara: 'Portal Pewawancara', keuangan: 'Keuangan', master: 'Master',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', guru: 'Guru', pewawancara: 'Pewawancara',
  siswa: 'Siswa', ortu: 'Orang Tua',
};

const ROLE_COLOR: Record<string, string> = {
  admin: '#6366F1', guru: '#10B981', pewawancara: '#14B8A6',
  siswa: '#F59E0B', ortu: '#8B5CF6',
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let href = '';
  for (const part of parts) {
    href += `/${part}`;
    const label = LABELS[part] ?? (part.length > 16 ? part.slice(0, 14) + '…' : part);
    crumbs.push({ label, href });
  }
  return crumbs;
}

// ── notifications (static placeholder — wire to API when ready) ───────────────
const NOTIFS = [
  { id: 1, title: 'Pendaftar baru', body: 'Ahmad Fadhil mendaftar ke SMP', time: '2 menit lalu', read: false, color: '#14B8A6' },
  { id: 2, title: 'Catatan selesai', body: 'Pewawancara Budi menyelesaikan 3 catatan', time: '1 jam lalu', read: false, color: '#6366F1' },
  { id: 3, title: 'Sistem', body: 'Backup database berhasil', time: '3 jam lalu', read: true, color: '#10B981' },
];

export default function Topbar() {
  const { user, logout, originalToken, restoreOriginal } = useAuthStore();
  const router = useRouter();
  const crumbs = useBreadcrumbs();

  const [userOpen, setUserOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs]       = useState(NOTIFS);

  const userRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;
  const accentColor = ROLE_COLOR[user?.role ?? 'admin'] ?? '#60A5FA';
  const initial = (user?.nama || user?.email || 'U')[0].toUpperCase();

  // close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  function markAllRead() {
    setNotifs(n => n.map(x => ({ ...x, read: true })));
  }

  const dropdownVariants = {
    hidden:  { opacity: 0, y: -8, scale: 0.96 },
    visible: { opacity: 1, y: 0,  scale: 1 },
    exit:    { opacity: 0, y: -8, scale: 0.96 },
  };

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-5 gap-4 sticky top-0 z-30 shadow-sm">

      {/* Breadcrumbs */}
      <nav className="flex-1 flex items-center gap-1.5 min-w-0">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />}
            {i === crumbs.length - 1 ? (
              <span className="text-sm font-semibold text-gray-800 truncate">{c.label}</span>
            ) : (
              <Link href={c.href} className="text-sm text-gray-400 hover:text-gray-600 transition-colors truncate">
                {c.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Switch-back banner */}
      {originalToken && (
        <button
          onClick={restoreOriginal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
        >
          <RefreshCw size={12} />
          Kembali ke akun asli
        </button>
      )}

      {/* Notification bell */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div>
                  <p className="text-sm font-bold text-gray-900">Notifikasi</p>
                  {unread > 0 && <p className="text-xs text-gray-400">{unread} belum dibaca</p>}
                </div>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
                    Tandai semua dibaca
                  </button>
                )}
              </div>

              {/* List */}
              <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {notifs.map(n => (
                  <li
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                  >
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: n.color }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />}
                  </li>
                ))}
              </ul>

              <div className="px-4 py-2.5 border-t border-gray-50 text-center">
                <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Lihat semua notifikasi</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User dropdown */}
      <div ref={userRef} className="relative">
        <button
          onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
          className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` }}
          >
            {initial}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-gray-800 leading-none">{user?.nama?.split(' ')[0] ?? 'Admin'}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</p>
          </div>
          <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {userOpen && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15)' }}
            >
              {/* Profile header */}
              <div className="px-4 py-4 border-b border-gray-50" style={{ background: `linear-gradient(135deg, ${accentColor}10, ${accentColor}05)` }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.nama}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    <span
                      className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Shield size={9} />
                      {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1.5">
                <Link
                  href="/settings"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <User size={14} className="text-gray-500" />
                  </div>
                  Profil Saya
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Settings size={14} className="text-gray-500" />
                  </div>
                  Pengaturan
                </Link>
              </div>

              <div className="px-3 pb-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
