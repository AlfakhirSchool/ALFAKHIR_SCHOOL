'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, Bell, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const handleLogout = () => { logout(); router.push('/login'); };
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
  const picUrl = user?.profile_pic
    ? user.profile_pic.startsWith('http') ? user.profile_pic : `${apiBase}${user.profile_pic}`
    : null;

  const { data: pending = [] } = useQuery({
    queryKey: ['my-pending'],
    queryFn: () => api.get('/pending-changes/mine').then((r: any) => r.data.data || []),
    refetchInterval: 30000,
  });

  const { data: dashData } = useQuery({
    queryKey: ['guru-dashboard'],
    queryFn: () => api.get('/dashboard/guru').then((r: any) => r.data.data),
    refetchInterval: 60000,
  });

  const jadwalHariIni: any[] = dashData?.jadwalHariIni || [];
  const pendingJurnal: any[] = dashData?.pendingJurnal || [];

  type NotifItem = { id: string; type: string; text: string; sub?: string; status?: string };
  const notifs: NotifItem[] = [
    ...(pending as any[]).map((p: any) => ({
      id: p.id,
      type: p.status === 'approved' ? 'ok' : p.status === 'rejected' ? 'err' : 'pending',
      text: p.type === 'password' ? 'Permintaan ubah password' : `Permintaan ubah nama`,
      sub: p.status === 'approved' ? 'Disetujui admin' : p.status === 'rejected' ? 'Ditolak admin' : 'Menunggu persetujuan admin',
      status: p.status,
    })),
    ...jadwalHariIni.slice(0, 3).map((j: any) => ({
      id: `jadwal-${j.id}`,
      type: 'info',
      text: `Jadwal: ${j.mata_pelajaran?.nama || j.mapel || 'Pelajaran'}`,
      sub: `${j.kelas?.nama || ''} · ${j.jam_mulai || ''}–${j.jam_selesai || ''}`,
    })),
    ...pendingJurnal.slice(0, 2).map((j: any) => ({
      id: `jurnal-${j.id}`,
      type: 'warn',
      text: `Jurnal belum disubmit`,
      sub: j.kelas?.nama || '',
    })),
  ];

  const unread = notifs.filter(n => n.status === 'pending' || n.type === 'warn').length
    + (jadwalHariIni.length > 0 ? 1 : 0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const iconFor = (type: string) => type === 'ok' ? '✓' : type === 'err' ? '✕' : type === 'warn' ? '!' : type === 'pending' ? '…' : '·';

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-lg font-semibold text-[#1A2332]">{title}</h1>
      <div className="flex items-center gap-4">

        {/* Bell */}
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(v => !v)}
            className="relative text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-sm text-[#1A2332]">Notifikasi</p>
              </div>
              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada notifikasi</div>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {notifs.map(n => (
                    <li key={n.id} className="px-4 py-3 hover:bg-gray-50 flex gap-3 items-start">
                      <span className="text-base mt-0.5">{iconFor(n.type)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{n.text}</p>
                        {n.sub && <p className="text-xs text-gray-400 mt-0.5">{n.sub}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => setProfileOpen(v => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow bg-[#1B8B87]">
              {picUrl
                ? <img src={picUrl} alt="" className="w-full h-full object-cover" />
                : user?.nama?.charAt(0) || 'G'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-tight">{user?.nama}</p>
              <p className="text-xs text-gray-400">Guru</p>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <Link href="/settings" onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Settings size={15} className="text-gray-400" /> Pengaturan
              </Link>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
                <LogOut size={15} /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
