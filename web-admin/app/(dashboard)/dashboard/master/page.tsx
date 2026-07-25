'use client';

import { useEffect, useState } from 'react';
import { Users, GraduationCap, School, CheckCircle, BookOpen, Lock, Trash2, Shield, Smartphone, Globe, Cpu, KeyRound, Plus, Search, Settings, UserCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const ROLE_ICON: Record<string, import('react').ReactNode> = {
  admin: <Shield size={16} />, guru: <Users size={16} />, siswa: <GraduationCap size={16} />, ortu: <UserCircle size={16} />,
};
const ROLE_COLOR: Record<string, string> = {
  admin: '#F97316', guru: '#2563EB', siswa: '#16A34A', ortu: '#9333EA',
};
const APP_ICON: Record<string, import('react').ReactNode> = {
  'Web': <Globe size={14} />, 'Siswa App': <Smartphone size={14} />, 'Guru App': <Smartphone size={14} />,
  'Orang Tua App': <Smartphone size={14} />, 'Mobile App': <Smartphone size={14} />, 'API': <Cpu size={14} />,
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}d lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const StatCard = ({ label, value, icon, color }: { label: string; value: number | string; icon: import('react').ReactNode; color: string }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[#1A2332] mt-1">{value}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

const LevelRow = ({ label, color, d }: { label: string; color: string; d: any }) => {
  const pct = d.totalSiswa > 0 ? Math.round((d.absensiHariIni / d.totalSiswa) * 100) : 0;
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-black" style={{ backgroundColor: color }}>
          {label}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-[#1A2332]">{d.namaSekolah || `Al Fakhir ${label}`}</span>
            <span className="text-gray-400">{d.absensiHariIni}/{d.totalSiswa} hadir ({pct}%)</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div><span className="font-bold" style={{ color }}>{d.totalSiswa}</span><br /><span className="text-gray-400 text-xs">Siswa</span></div>
        <div><span className="font-bold" style={{ color }}>{d.totalKelas}</span><br /><span className="text-gray-400 text-xs">Kelas</span></div>
        <div><span className="font-bold text-green-600">{d.absensiHariIni}</span><br /><span className="text-gray-400 text-xs">Hadir</span></div>
      </div>
    </div>
  );
};

function timeAgoShort(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export default function MasterDashboard() {
  const qc = useQueryClient();
  const [feed, setFeed] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-v2'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
    refetchInterval: 15000,
  });

  const { data: deleteReqs, refetch: refetchDR } = useQuery({
    queryKey: ['delete-requests-pending'],
    queryFn: () => api.get('/delete-requests?status=pending').then(r => r.data.data || []),
    refetchInterval: 30000,
  });

  const approveDR = useMutation({
    mutationFn: (id: string) => api.put(`/delete-requests/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delete-requests-pending'] }); qc.invalidateQueries({ queryKey: ['kelas-admin'] }); },
  });

  const rejectDR = useMutation({
    mutationFn: (id: string) => api.put(`/delete-requests/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delete-requests-pending'] }),
  });

  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIds = useState<Set<string>>(new Set())[0];

  const fetchFeed = async () => {
    try {
      const r = await api.get('/audit-log/live?limit=50');
      const rows = r.data.data || [];
      const incoming = new Set<string>(rows.map((x: any) => x.id));
      const fresh = new Set<string>([...incoming].filter(id => !prevIds.has(id)));
      if (fresh.size > 0) {
        setNewIds(fresh);
        setTimeout(() => setNewIds(new Set()), 4000);
      }
      rows.forEach((x: any) => prevIds.add(x.id));
      setFeed(rows);
    } catch {}
    setFeedLoading(false);
  };

  useEffect(() => {
    fetchFeed();
    const t = setInterval(fetchFeed, 5000);
    return () => clearInterval(t);
  }, []);

  const kpi = data?.kpi || {};
  const s = data?.sekolah || {};
  const sd  = s.sd  || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const smp = s.smp || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const sma = s.sma || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };

  return (
    <div>
      <Header title="Master Monitoring" />
      <div className="p-6 space-y-6">

        {/* Banner tri-color */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <div className="flex h-3">
            <div className="flex-1" style={{ backgroundColor: '#F97316' }} />
            <div className="flex-1" style={{ backgroundColor: '#2563EB' }} />
            <div className="flex-1" style={{ backgroundColor: '#7C3AED' }} />
          </div>
          <div className="bg-[#1A2332] p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: '#F97316' }}>SD</span>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: '#2563EB' }}>SMP</span>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: '#7C3AED' }}>SMA</span>
              </div>
              <div>
                <p className="font-bold text-white text-lg">Master Control Center</p>
                <p className="text-gray-400 text-xs">Monitoring seluruh jenjang & aktivitas user secara real-time</p>
              </div>
            </div>
            <a href="/audit-log" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">
              Lihat Semua Log →
            </a>
          </div>
        </div>

        {isLoading ? <div className="text-center py-10 text-gray-400">Memuat data...</div> : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Siswa"    value={kpi.totalSiswa    ?? 0} icon={<GraduationCap size={28} />} color="#2563EB" />
              <StatCard label="Total Guru"     value={kpi.totalGuru     ?? 0} icon={<Users size={28} />}        color="#F97316" />
              <StatCard label="Total Kelas"    value={kpi.totalKelas    ?? 0} icon={<School size={28} />}       color="#7C3AED" />
              <StatCard label="Hadir Hari Ini" value={kpi.absensiHariIni ?? 0} icon={<CheckCircle size={28} />} color="#16A34A" />
            </div>

            {/* Per jenjang */}
            <h2 className="font-bold text-[#1A2332]">Kehadiran Per Jenjang</h2>
            <div className="space-y-4">
              <LevelRow label="SD"  color="#F97316" d={sd}  />
              <LevelRow label="SMP" color="#2563EB" d={smp} />
              <LevelRow label="SMA" color="#7C3AED" d={sma} />
            </div>

            {(kpi.pendingJurnal ?? 0) > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                <BookOpen size={24} className="text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">Jurnal Guru Pending</p>
                  <p className="text-sm text-yellow-600">{kpi.pendingJurnal} jurnal menunggu review</p>
                </div>
                <a href="/jurnal-guru" className="ml-auto px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium">Review</a>
              </div>
            )}

            {/* Permintaan Hapus Data */}
            {(deleteReqs || []).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-red-100">
                <div className="px-6 py-4 border-b border-red-100 flex items-center gap-3 bg-red-50">
                  <Lock size={24} className="text-red-600" />
                  <div className="flex-1">
                    <p className="font-bold text-red-800">Permintaan Hapus Data</p>
                    <p className="text-sm text-red-600">{(deleteReqs || []).length} permintaan menunggu verifikasi Feri</p>
                  </div>
                </div>
                <ul className="divide-y divide-gray-50">
                  {(deleteReqs || []).map((dr: any) => (
                    <li key={dr.id} className="px-6 py-4 flex items-start gap-4">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 flex-shrink-0"><Trash2 size={18} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1A2332] text-sm">{dr.resource_name}</p>
                        <p className="text-xs text-gray-500">
                          Diminta oleh <strong>{dr.requester_nama}</strong>
                          {dr.requester_jenjang && <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{dr.requester_jenjang}</span>}
                          <span className="ml-2 text-gray-400">{timeAgoShort(dr.created_at)}</span>
                        </p>
                        {dr.reason && <p className="text-xs text-gray-400 mt-0.5 italic">"{dr.reason}"</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => approveDR.mutate(dr.id)} disabled={approveDR.isPending}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                          ✓ Setujui Hapus
                        </button>
                        <button onClick={() => rejectDR.mutate(dr.id)} disabled={rejectDR.isPending}
                          className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50">
                          ✕ Tolak
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { href: '/users', icon: <KeyRound size={20} />, label: 'Reset Password', desc: 'Pulihkan akun lupa sandi', color: '#2563EB' },
            { href: '/users', icon: <Plus size={20} />, label: 'Daftar Akun Baru', desc: 'Tambah user guru/siswa', color: '#F97316' },
            { href: '/audit-log', icon: <Search size={20} />, label: 'Audit Log', desc: 'Riwayat semua aktivitas', color: '#7C3AED' },
            { href: '/settings', icon: <Settings size={20} />, label: 'Pengaturan', desc: 'Konfigurasi sistem', color: '#16A34A' },
          ] as { href: string; icon: import('react').ReactNode; label: string; desc: string; color: string }[]).map(item => (
            <a key={item.label} href={item.href}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-gray-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color + '15', color: item.color }}>
                {item.icon}
              </div>
              <div>
                <p className="font-bold text-sm text-[#1A2332]">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h3 className="font-bold text-[#1A2332]">Aktivitas Live</h3>
              <span className="text-xs text-gray-400">· refresh setiap 5 detik</span>
            </div>
            <a href="/audit-log" className="text-xs text-blue-600 hover:underline">Lihat semua →</a>
          </div>

          {feedLoading ? (
            <div className="text-center py-10 text-gray-400 text-sm">Memuat aktivitas...</div>
          ) : feed.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Belum ada aktivitas tercatat</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {feed.map((log) => (
                <li key={log.id} className={`flex items-start gap-3 px-6 py-3 transition-colors ${newIds.has(log.id) ? 'bg-green-50 border-l-4 border-green-400' : 'hover:bg-gray-50'}`}>
                  {/* Role badge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: (ROLE_COLOR[log.role] || '#888') + '20' }}
                  >
                    {ROLE_ICON[log.role] || <UserCircle size={16} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {newIds.has(log.id) && <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">BARU</span>}
                      <span className="font-semibold text-sm text-[#1A2332] truncate">{log.nama || 'Anonim'}</span>
                      {log.role && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                          style={{ backgroundColor: ROLE_COLOR[log.role] || '#888' }}
                        >
                          {log.role}
                        </span>
                      )}
                      {log.school_level && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          {log.school_level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm text-gray-700">{log.action}</span>
                      {log.table_name && (
                        <span className="text-xs text-gray-400">· {log.table_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
                      <span>{APP_ICON[log.app_source] || <Globe size={14} />}</span>
                      <span>{log.app_source || 'Web'}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(log.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
