'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type Notif = { id: string; type: string; message: string; created_at: string; read: boolean };
type ActivityItem = { id: string; type: string; title: string; desc: string; level?: string; kandidat_id?: string; time: string };

const ACTIVITY_META: Record<string, { icon: string; color: string }> = {
  catatan:  { icon: '📝', color: '#1B8B87' },
  form:     { icon: '📋', color: '#2563EB' },
  kandidat: { icon: '👤', color: '#D97706' },
};

const NOTIF_META: Record<string, { icon: string; color: string; bg: string }> = {
  jurnal:    { icon: '📝', color: '#2563EB', bg: '#EFF6FF' },
  siswa:     { icon: '👨‍🎓', color: '#16A34A', bg: '#F0FDF4' },
  pembayaran:{ icon: '💳', color: '#9333EA', bg: '#FAF5FF' },
  absensi:   { icon: '✅', color: '#1B8B87', bg: '#F0FDFA' },
  alfa:      { icon: '⚠️', color: '#DC2626', bg: '#FEF2F2' },
  tagihan:   { icon: '🔔', color: '#D97706', bg: '#FFFBEB' },
  default:   { icon: '📌', color: '#6B7280', bg: '#F9FAFB' },
};

interface HeaderProps {
  title: string;
}

const LEVEL_COLOR: Record<string, string> = {
  SD:  '#F97316',
  SMP: '#1B8B87',
  SMA: '#3B82F6',
};

export default function Header({ title }: HeaderProps) {
  const { user, logout, switchAccount, restoreOriginal, originalToken } = useAuthStore();
  const router = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [adminList, setAdminList] = useState<any[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    setNotifLoading(true);
    try {
      const [notifRes, actRes] = await Promise.allSettled([
        api.get('/notifikasi'),
        api.get('/jawaban-form/activity-feed'),
      ]);
      if (notifRes.status === 'fulfilled') setNotifs(notifRes.value.data.data || []);
      if (actRes.status === 'fulfilled') setActivityFeed((actRes.value.data.data || []).slice(0, 8));
    } catch {
      // silently fail
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    fetchNotifs();
  }, [notifOpen, fetchNotifs]);

  // Auto-refresh setiap 2 menit
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 120_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const isMaster = !user?.school_level;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!userOpen || !isAdmin) return;
    api.get('/users', { params: { role: 'admin', limit: 20 } })
      .then(r => {
        const all: any[] = r.data.data || [];
        const filtered = all.filter((a: any) => {
          if (a.id === user?.id) return false;
          // level admin cannot see master (no school_level)
          if (!isMaster && !a.school_level) return false;
          // master sees only level admins
          if (isMaster) return !!a.school_level;
          return !!a.school_level;
        });
        setAdminList(filtered);
      })
      .catch(() => {});
  }, [userOpen, isAdmin, isMaster, user?.id]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  async function handleSwitch(admin: any) {
    setSwitching(admin.id);
    try {
      const res = await api.post(`/auth/switch-account/${admin.id}`);
      const { accessToken, user: targetUser } = res.data.data;
      switchAccount({
        id: targetUser.id,
        email: targetUser.email,
        nama: targetUser.nama,
        role: targetUser.role,
        school_level: targetUser.school_level,
        profile_pic: targetUser.profile_pic,
      }, accessToken);
      setUserOpen(false);
      const lvl = targetUser.school_level;
      router.push(lvl ? `/dashboard/${lvl.toLowerCase()}` : '/dashboard');
      window.location.reload();
    } catch {
      // silently fail
    } finally {
      setSwitching(null);
    }
  }

  const picUrl = user?.profile_pic
    ? user.profile_pic.startsWith('http')
      ? user.profile_pic
      : `${(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')}${user.profile_pic}`
    : null;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-lg font-semibold text-[#1A2332]">{title}</h1>
      <div className="flex items-center gap-3">

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(v => !v); setUserOpen(false); }}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {(notifs.filter(n => !n.read).length > 0 || activityFeed.length > 0) && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                {notifs.filter(n => !n.read).length + activityFeed.length > 9 ? '9+' : notifs.filter(n => !n.read).length + activityFeed.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden" style={{ width: 340 }}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#1A2332]">Notifikasi</span>
                  {notifs.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifs.length}</span>
                  )}
                </div>
                <button onClick={fetchNotifs} className="text-xs text-[#1B8B87] hover:underline">
                  {notifLoading ? 'Memuat...' : 'Perbarui'}
                </button>
              </div>
              <div className="py-1 max-h-80 overflow-y-auto">
                {notifLoading && notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-5 h-5 border-2 border-[#1B8B87] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Memuat notifikasi...</p>
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <span className="text-3xl">🔔</span>
                    <p className="text-sm text-gray-500 mt-2">Tidak ada notifikasi</p>
                    <p className="text-xs text-gray-400 mt-0.5">Semua aktivitas terkini akan muncul di sini</p>
                  </div>
                ) : (
                  notifs.map((n) => {
                    const meta = NOTIF_META[n.type] || NOTIF_META.default;
                    return (
                      <div key={n.id} className="px-4 py-3 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0 cursor-pointer">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base" style={{ backgroundColor: meta.bg }}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 leading-snug">{n.message}</p>
                          <p className="text-xs mt-0.5 font-medium" style={{ color: meta.color }}>
                            {n.type === 'jurnal' ? 'Jurnal Guru' :
                             n.type === 'siswa' ? 'Data Siswa' :
                             n.type === 'pembayaran' ? 'Pembayaran' :
                             n.type === 'absensi' ? 'Absensi Gerbang' :
                             n.type === 'alfa' ? 'Perhatian' :
                             n.type === 'tagihan' ? 'Tagihan' : 'Sistem'}
                          </p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: meta.color }} />}
                      </div>
                    );
                  })
                )}
              </div>
              {activityFeed.length > 0 && (
                <div className="border-t border-gray-100">
                  <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktivitas Penerimaan</span>
                    <span className="text-xs bg-[#1B8B87] text-white px-1.5 py-0.5 rounded-full font-bold">{activityFeed.length}</span>
                  </div>
                  {activityFeed.map((a) => {
                    const meta = ACTIVITY_META[a.type] || { icon: '📌', color: '#6B7280' };
                    return (
                      <div key={`act-${a.id}`} className="px-4 py-3 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base bg-gray-50">{meta.icon}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 leading-snug">{a.desc}</p>
                          <p className="text-xs mt-0.5 font-medium" style={{ color: meta.color }}>{a.title}{a.level ? ` · ${a.level}` : ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 text-center">Diperbarui otomatis setiap 2 menit</p>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setUserOpen(v => !v); setNotifOpen(false); }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
          >
            <div className="w-8 h-8 bg-[#3B7FD1] rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold shrink-0">
              {picUrl ? (
                <img src={picUrl} alt="foto" className="w-full h-full object-cover" />
              ) : (
                user?.nama?.charAt(0) || 'A'
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-tight">{user?.nama}</p>
              <p className="text-xs text-gray-400 capitalize leading-tight">
                {user?.school_level ? `Admin ${user.school_level}` : user?.role}
              </p>
            </div>
            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${userOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.nama}</p>
                <p className="text-xs text-gray-400 truncate">{(user?.email || '').replace(/@[^@]+$/, '')}</p>
                {originalToken && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mt-1 inline-block">Akun dialihkan</span>
                )}
              </div>

              {originalToken && (
                <button
                  onClick={restoreOriginal}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#3B7FD1] hover:bg-blue-50 transition-colors font-medium border-b border-gray-100"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Kembali ke Akun Asal
                </button>
              )}

              {isAdmin && adminList.length > 0 && (
                <div className="border-b border-gray-100">
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pindah Akun</p>
                  <div className="max-h-48 overflow-y-auto">
                    {adminList.map((a: any) => {
                      const lvl = a.school_level;
                      const color = lvl ? (LEVEL_COLOR[lvl] || '#3B7FD1') : '#3B7FD1';
                      return (
                        <button
                          key={a.id}
                          onClick={() => handleSwitch(a)}
                          disabled={!!switching}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {a.nama?.charAt(0) || 'A'}
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-gray-800 font-medium truncate text-xs">{a.nama}</p>
                            <p className="text-gray-400 text-xs">Admin {lvl || 'Master'}</p>
                          </div>
                          {switching === a.id && (
                            <svg className="w-3.5 h-3.5 animate-spin text-gray-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar dari Akun
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
