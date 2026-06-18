'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const LEVELS = [
  { key: 'all', label: 'Semua',  icon: '🏫', color: '#3B7FD1', bg: 'bg-[#3B7FD1]',   border: 'border-[#3B7FD1]',   light: 'bg-[#3B7FD1]/10',  text: 'text-[#3B7FD1]',  fullName: 'Semua Jenjang' },
  { key: 'sd',  label: 'SD',     icon: '🟢', color: '#16A34A', bg: 'bg-green-600',   border: 'border-green-600',   light: 'bg-green-50',       text: 'text-green-700',  fullName: 'Sekolah Dasar' },
  { key: 'smp', label: 'SMP',    icon: '🔵', color: '#3B7FD1', bg: 'bg-blue-600',    border: 'border-blue-600',    light: 'bg-blue-50',        text: 'text-blue-700',   fullName: 'Sekolah Menengah Pertama' },
  { key: 'sma', label: 'SMA',    icon: '🟣', color: '#9333EA', bg: 'bg-purple-600',  border: 'border-purple-600',  light: 'bg-purple-50',      text: 'text-purple-700', fullName: 'Sekolah Menengah Atas' },
] as const;

type LevelKey = typeof LEVELS[number]['key'];

const StatCard = ({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) => (
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

export default function DashboardPage() {
  const [activeLevel, setActiveLevel] = useState<LevelKey>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-v2'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const kpi = data?.kpi || {};
  const sekolah = data?.sekolah || {};

  const sdData  = sekolah.sd  || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const smpData = sekolah.smp || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const smaData = sekolah.sma || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };

  const activeLvl = LEVELS.find(l => l.key === activeLevel)!;

  const currentData = activeLevel === 'all' ? null
    : activeLevel === 'sd'  ? sdData
    : activeLevel === 'smp' ? smpData
    : smaData;

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {LEVELS.map(lvl => (
            <button
              key={lvl.key}
              onClick={() => setActiveLevel(lvl.key)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border-2 ${
                activeLevel === lvl.key
                  ? `${lvl.bg} text-white border-transparent shadow-md`
                  : `bg-white ${lvl.text} ${lvl.border} hover:${lvl.light}`
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat data...</div>
        ) : (
          <>
            {/* ── SEMUA ── */}
            {activeLevel === 'all' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Siswa"    value={kpi.totalSiswa    ?? 0} icon="👨‍🎓" color="#3B7FD1" />
                  <StatCard label="Total Guru"     value={kpi.totalGuru     ?? 0} icon="👨‍🏫" color="#1B8B87" />
                  <StatCard label="Total Kelas"    value={kpi.totalKelas    ?? 0} icon="🏫"  color="#FF8C42" />
                  <StatCard label="Hadir Hari Ini" value={kpi.absensiHariIni ?? 0} icon="✅" color="#16A34A" />
                </div>

                <h2 className="font-bold text-[#1A2332] text-lg">Monitoring Per Jenjang</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {([
                    { lvl: LEVELS[1], d: sdData  },
                    { lvl: LEVELS[2], d: smpData },
                    { lvl: LEVELS[3], d: smaData },
                  ] as const).map(({ lvl, d }) => (
                    <button
                      key={lvl.key}
                      onClick={() => setActiveLevel(lvl.key)}
                      className={`w-full text-left bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent hover:${lvl.border} hover:shadow-md transition-all`}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`w-12 h-12 rounded-xl ${lvl.light} flex items-center justify-center`}>
                          <span className={`text-xl font-black ${lvl.text}`}>{lvl.label}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-[#1A2332] text-base">{lvl.fullName}</h3>
                          <p className="text-xs text-gray-400">{(d as any).namaSekolah || `Al Fakhir ${lvl.label}`}</p>
                        </div>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${lvl.light} ${lvl.text} font-medium`}>Lihat →</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`rounded-xl p-3 ${lvl.light} text-center`}>
                          <p className={`text-2xl font-black ${lvl.text}`}>{d.totalSiswa}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Siswa</p>
                        </div>
                        <div className={`rounded-xl p-3 ${lvl.light} text-center`}>
                          <p className={`text-2xl font-black ${lvl.text}`}>{d.totalKelas}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Kelas</p>
                        </div>
                        <div className="rounded-xl p-3 bg-green-50 text-center">
                          <p className="text-2xl font-black text-green-600">{d.absensiHariIni}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Hadir</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {(kpi.pendingJurnal ?? 0) > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">📓</span>
                    <div>
                      <p className="font-semibold text-yellow-800">Jurnal Guru Pending</p>
                      <p className="text-sm text-yellow-600">{kpi.pendingJurnal} jurnal menunggu review</p>
                    </div>
                    <a href="/jurnal-guru" className="ml-auto px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600">Review</a>
                  </div>
                )}
              </>
            )}

            {/* ── SD / SMP / SMA ── */}
            {activeLevel !== 'all' && currentData && (
              <>
                {/* Header jenjang */}
                <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${activeLvl.border}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl ${activeLvl.light} flex items-center justify-center`}>
                      <span className={`text-2xl font-black ${activeLvl.text}`}>{activeLvl.label}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#1A2332]">{activeLvl.fullName}</h2>
                      <p className="text-sm text-gray-400">{(currentData as any).namaSekolah || `Al Fakhir ${activeLvl.label}`}</p>
                    </div>
                    <div className="ml-auto">
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${activeLvl.light} ${activeLvl.text}`}>
                        Tahun Ajaran 2025/2026
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI jenjang */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Siswa"    value={currentData.totalSiswa}     icon="👨‍🎓" color={activeLvl.color} />
                  <StatCard label="Total Kelas"    value={currentData.totalKelas}     icon="🏫"  color={activeLvl.color} />
                  <StatCard label="Hadir Hari Ini" value={currentData.absensiHariIni} icon="✅"  color="#16A34A" />
                  <StatCard
                    label="% Kehadiran"
                    value={currentData.totalSiswa > 0
                      ? Math.round((currentData.absensiHariIni / currentData.totalSiswa) * 100) + '%'
                      : '0%'}
                    icon="📊"
                    color={activeLvl.color}
                  />
                </div>

                {/* Progress kehadiran */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-[#1A2332] mb-4">Kehadiran Hari Ini</h3>
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm text-gray-500 w-24">Hadir</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-4 rounded-full bg-green-500 transition-all"
                        style={{ width: currentData.totalSiswa > 0 ? `${(currentData.absensiHariIni / currentData.totalSiswa) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm font-bold text-green-600 w-16 text-right">
                      {currentData.absensiHariIni}/{currentData.totalSiswa}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 w-24">Belum Hadir</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-4 rounded-full bg-red-400 transition-all"
                        style={{ width: currentData.totalSiswa > 0 ? `${((currentData.totalSiswa - currentData.absensiHariIni) / currentData.totalSiswa) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm font-bold text-red-500 w-16 text-right">
                      {currentData.totalSiswa - currentData.absensiHariIni}/{currentData.totalSiswa}
                    </span>
                  </div>
                </div>

                {/* Shortcut links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a href={`/siswa?level=${activeLvl.label}`}
                    className={`flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border-2 ${activeLvl.border} hover:shadow-md transition-all`}>
                    <span className="text-2xl">👨‍🎓</span>
                    <div>
                      <p className={`font-bold ${activeLvl.text}`}>Data Siswa</p>
                      <p className="text-xs text-gray-400">{currentData.totalSiswa} siswa terdaftar</p>
                    </div>
                  </a>
                  <a href={`/kelas?level=${activeLvl.label}`}
                    className={`flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border-2 ${activeLvl.border} hover:shadow-md transition-all`}>
                    <span className="text-2xl">🏫</span>
                    <div>
                      <p className={`font-bold ${activeLvl.text}`}>Data Kelas</p>
                      <p className="text-xs text-gray-400">{currentData.totalKelas} kelas aktif</p>
                    </div>
                  </a>
                  <a href="/absensi"
                    className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border-2 border-green-200 hover:shadow-md transition-all">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-bold text-green-700">Absensi</p>
                      <p className="text-xs text-gray-400">{currentData.absensiHariIni} hadir hari ini</p>
                    </div>
                  </a>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
