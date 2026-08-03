'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [switchOpen, setSwitchOpen] = useState(false);
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
            <div
              className="absolute right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50"
              style={{ width: 360, boxShadow: '0 20px 60px -10px rgba(0,0,0,0.18)' }}
            >
              {/* Header — sticky */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between rounded-t-2xl bg-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900">Notifikasi</span>
                  {(notifs.filter(n=>!n.read).length + activityFeed.length) > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {notifs.filter(n=>!n.read).length + activityFeed.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchNotifs}
                  className="flex items-center gap-1 text-xs text-[#1B8B87] hover:text-[#146f6b] font-medium transition-colors"
                >
                  {notifLoading ? (
                    <span className="w-3 h-3 border border-[#1B8B87] border-t-transparent rounded-full animate-spin inline-block" />
                  ) : '↻'} Perbarui
                </button>
              </div>

              {/* Scrollable content — fixed height */}
              <div style={{ maxHeight: 400, overflowY: 'auto', overflowX: 'hidden' }}>

                {/* Group 1: notifikasi sistem */}
                {notifs.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sistem</span>
                      <span className="h-px flex-1 bg-gray-100" />
                      <span className="text-[10px] text-gray-400">{notifs.length}</span>
                    </div>
                    {notifs.map((n) => {
                      const meta = NOTIF_META[n.type] || NOTIF_META.default;
                      const label = n.type === 'jurnal' ? 'Jurnal Guru'
                        : n.type === 'siswa' ? 'Data Siswa'
                        : n.type === 'pembayaran' ? 'Pembayaran'
                        : n.type === 'absensi' ? 'Absensi Gerbang'
                        : n.type === 'alfa' ? 'Perhatian'
                        : n.type === 'tagihan' ? 'Tagihan' : 'Sistem';
                      return (
                        <div key={n.id} className={`mx-2 mb-1 px-3 py-2.5 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm" style={{ backgroundColor: meta.bg }}>
                            {meta.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-gray-800 leading-snug">{n.message}</p>
                            <p className="text-[11px] mt-0.5 font-semibold" style={{ color: meta.color }}>{label}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: meta.color }} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state jika notifs kosong */}
                {notifs.length === 0 && !notifLoading && activityFeed.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <div className="text-4xl mb-2">🔔</div>
                    <p className="text-sm font-medium text-gray-500">Tidak ada notifikasi</p>
                    <p className="text-xs text-gray-400 mt-1">Aktivitas terbaru akan muncul di sini</p>
                  </div>
                )}

                {/* Loading */}
                {notifLoading && notifs.length === 0 && activityFeed.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <div className="w-5 h-5 border-2 border-[#1B8B87] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Memuat...</p>
                  </div>
                )}

                {/* Group 2: aktivitas penerimaan, per-tipe */}
                {activityFeed.length > 0 && (() => {
                  const groups: Record<string, ActivityItem[]> = {};
                  activityFeed.forEach(a => {
                    const key = a.type || 'lain';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(a);
                  });
                  const groupLabel: Record<string, string> = {
                    catatan: 'Catatan Pewawancara',
                    form: 'Formulir Masuk',
                    kandidat: 'Kandidat Baru',
                    lain: 'Aktivitas Lain',
                  };
                  return Object.entries(groups).map(([type, items]) => {
                    const meta = ACTIVITY_META[type] || { icon: '📌', color: '#6B7280' };
                    return (
                      <div key={type}>
                        <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                            {groupLabel[type] ?? type}
                          </span>
                          <span className="h-px flex-1" style={{ backgroundColor: meta.color + '30' }} />
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: meta.color }}
                          >{items.length}</span>
                        </div>
                        {items.map((a) => (
                          <div key={`act-${a.id}`} className="mx-2 mb-1 px-3 py-2.5 rounded-xl flex items-start gap-3 hover:bg-gray-50 transition-colors">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm bg-gray-50">
                              {meta.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-gray-800 leading-snug">{a.desc}</p>
                              <p className="text-[11px] mt-0.5 font-semibold" style={{ color: meta.color }}>
                                {a.title}{a.level ? ` · ${a.level}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  });
                })()}

                <div className="h-2" />
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 rounded-b-2xl">
                <p className="text-[11px] text-gray-400 text-center">Auto-refresh setiap 2 menit</p>
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
                  <button
                    onClick={() => setSwitchOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Pindah Akun
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${switchOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {switchOpen && (
                    <div className="max-h-48 overflow-y-auto border-t border-gray-50">
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
                  )}
                </div>
              )}

              <Link
                href="/settings"
                onClick={() => setUserOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Pengaturan
              </Link>
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
