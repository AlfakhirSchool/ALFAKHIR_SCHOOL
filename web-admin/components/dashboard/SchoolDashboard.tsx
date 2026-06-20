'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const LEVEL_CONFIG = {
  SD:  { color: '#16A34A', bg: 'bg-green-600',  border: 'border-green-500',  light: 'bg-green-50',   text: 'text-green-700',  fullName: 'Sekolah Dasar',            icon: '🏫' },
  SMP: { color: '#3B7FD1', bg: 'bg-blue-600',   border: 'border-blue-500',   light: 'bg-blue-50',    text: 'text-blue-700',   fullName: 'Sekolah Menengah Pertama', icon: '🏫' },
  SMA: { color: '#9333EA', bg: 'bg-purple-600', border: 'border-purple-500', light: 'bg-purple-50',  text: 'text-purple-700', fullName: 'Sekolah Menengah Atas',    icon: '🏫' },
} as const;

type Level = keyof typeof LEVEL_CONFIG;

const StatBox = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
    <p className="text-4xl font-black" style={{ color }}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export default function SchoolDashboard({ level }: { level: Level }) {
  const cfg = LEVEL_CONFIG[level];
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    const sl = user?.school_level;
    if (sl && sl !== level) router.replace(`/dashboard/${sl.toLowerCase()}`);
  }, [isAuthenticated, user, level, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-v2'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const d = data?.sekolah?.[level.toLowerCase() as 'sd' | 'smp' | 'sma'] || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const pct = d.totalSiswa > 0 ? Math.round((d.absensiHariIni / d.totalSiswa) * 100) : 0;
  const belum = d.totalSiswa - d.absensiHariIni;

  return (
    <div>
      <Header title={`Dashboard ${level}`} />
      <div className="p-6 space-y-6">

        {/* Banner jenjang */}
        <div className={`rounded-2xl p-6 text-white`} style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-3xl font-black text-white">{level}</span>
            </div>
            <div>
              <h1 className="text-2xl font-black">{cfg.fullName}</h1>
              <p className="text-white/80 text-sm">{d.namaSekolah || `Al Fakhir ${level}`} · Tahun Ajaran 2025/2026</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat data...</div>
        ) : (
          <>
            {/* Stat boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox label="Total Siswa"    value={d.totalSiswa}     color={cfg.color} />
              <StatBox label="Total Kelas"    value={d.totalKelas}     color={cfg.color} />
              <StatBox label="Hadir Hari Ini" value={d.absensiHariIni} color="#16A34A"   sub={`dari ${d.totalSiswa} siswa`} />
              <StatBox label="% Kehadiran"    value={`${pct}%`}        color={pct >= 80 ? '#16A34A' : pct >= 60 ? '#F59E0B' : '#EF4444'} />
            </div>

            {/* Progress kehadiran */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#1A2332] mb-5">Kehadiran Hari Ini</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 font-medium">Hadir</span>
                    <span className="font-bold text-green-600">{d.absensiHariIni} siswa</span>
                  </div>
                  <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-5 rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 font-medium">Belum / Tidak Hadir</span>
                    <span className="font-bold text-red-500">{belum} siswa</span>
                  </div>
                  <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-5 rounded-full bg-red-400 transition-all duration-500"
                      style={{ width: d.totalSiswa > 0 ? `${(belum / d.totalSiswa) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Shortcut */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href={`/siswa?level=${level}`}
                className={`flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 ${cfg.border} hover:shadow-md transition-all`}>
                <div className={`w-12 h-12 rounded-xl ${cfg.light} flex items-center justify-center text-2xl`}>👨‍🎓</div>
                <div>
                  <p className={`font-bold ${cfg.text} text-base`}>Data Siswa {level}</p>
                  <p className="text-xs text-gray-400">{d.totalSiswa} siswa terdaftar</p>
                </div>
              </a>
              <a href={`/kelas?level=${level}`}
                className={`flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 ${cfg.border} hover:shadow-md transition-all`}>
                <div className={`w-12 h-12 rounded-xl ${cfg.light} flex items-center justify-center text-2xl`}>🏫</div>
                <div>
                  <p className={`font-bold ${cfg.text} text-base`}>Kelas {level}</p>
                  <p className="text-xs text-gray-400">{d.totalKelas} kelas aktif</p>
                </div>
              </a>
              <a href="/absensi"
                className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-green-300 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">✅</div>
                <div>
                  <p className="font-bold text-green-700 text-base">Absensi</p>
                  <p className="text-xs text-gray-400">{d.absensiHariIni} hadir hari ini</p>
                </div>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
