'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const LEVELS = [
  { key: 'all', label: 'Semua', color: '#3B7FD1', bg: 'bg-[#3B7FD1]', border: 'border-[#3B7FD1]', light: 'bg-[#3B7FD1]/10', text: 'text-[#3B7FD1]' },
  { key: 'sd',  label: 'SD',   color: '#16A34A', bg: 'bg-green-600',  border: 'border-green-600',  light: 'bg-green-50',   text: 'text-green-700' },
  { key: 'smp', label: 'SMP',  color: '#3B7FD1', bg: 'bg-blue-600',   border: 'border-blue-600',   light: 'bg-blue-50',    text: 'text-blue-700' },
  { key: 'sma', label: 'SMA',  color: '#9333EA', bg: 'bg-purple-600', border: 'border-purple-600', light: 'bg-purple-50',  text: 'text-purple-700' },
] as const;

type LevelKey = typeof LEVELS[number]['key'];

const StatCard = ({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4`} style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[#1A2332] mt-1">{value}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

const SchoolCard = ({
  level, nama, totalSiswa, totalKelas, absensiHariIni, isActive, onClick,
}: {
  level: typeof LEVELS[number]; nama?: string;
  totalSiswa: number; totalKelas: number; absensiHariIni: number;
  isActive: boolean; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left bg-white rounded-2xl p-6 shadow-sm border-2 transition-all hover:shadow-md ${
      isActive ? `${level.border} shadow-md` : 'border-transparent'
    }`}
  >
    {/* Header */}
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-12 h-12 rounded-xl ${level.light} flex items-center justify-center`}>
        <span className={`text-xl font-black ${level.text}`}>{level.label}</span>
      </div>
      <div>
        <h3 className="font-bold text-[#1A2332] text-lg">{level.label === 'SD' ? 'Sekolah Dasar' : level.label === 'SMP' ? 'Sekolah Menengah Pertama' : 'Sekolah Menengah Atas'}</h3>
        <p className="text-xs text-gray-400">{nama || `Al Fakhir ${level.label}`}</p>
      </div>
      {isActive && (
        <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${level.light} ${level.text}`}>Aktif</span>
      )}
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-3">
      <div className={`rounded-xl p-3 ${level.light} text-center`}>
        <p className={`text-2xl font-black ${level.text}`}>{totalSiswa}</p>
        <p className="text-xs text-gray-500 mt-0.5">Siswa</p>
      </div>
      <div className={`rounded-xl p-3 ${level.light} text-center`}>
        <p className={`text-2xl font-black ${level.text}`}>{totalKelas}</p>
        <p className="text-xs text-gray-500 mt-0.5">Kelas</p>
      </div>
      <div className="rounded-xl p-3 bg-green-50 text-center">
        <p className="text-2xl font-black text-green-600">{absensiHariIni}</p>
        <p className="text-xs text-gray-500 mt-0.5">Hadir Hari Ini</p>
      </div>
    </div>
  </button>
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

  const sdData   = sekolah.sd  || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const smpData  = sekolah.smp || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const smaData  = sekolah.sma || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };

  const activeSchoolData = activeLevel === 'all' ? null
    : activeLevel === 'sd' ? sdData
    : activeLevel === 'smp' ? smpData
    : smaData;

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat data...</div>
        ) : (
          <>
            {/* Global KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Siswa" value={kpi.totalSiswa ?? 0} icon="👨‍🎓" color="#3B7FD1" />
              <StatCard label="Total Guru" value={kpi.totalGuru ?? 0} icon="👨‍🏫" color="#1B8B87" />
              <StatCard label="Total Kelas" value={kpi.totalKelas ?? 0} icon="🏫" color="#FF8C42" />
              <StatCard label="Hadir Hari Ini" value={kpi.absensiHariIni ?? 0} icon="✅" color="#16A34A" />
            </div>

            {/* Section label */}
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-[#1A2332] text-lg">Monitoring Per Jenjang</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Klik kartu untuk detail</span>
            </div>

            {/* 3 School Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <SchoolCard
                level={LEVELS[1]}
                nama={sdData.namaSekolah}
                totalSiswa={sdData.totalSiswa}
                totalKelas={sdData.totalKelas}
                absensiHariIni={sdData.absensiHariIni}
                isActive={activeLevel === 'sd'}
                onClick={() => setActiveLevel(prev => prev === 'sd' ? 'all' : 'sd')}
              />
              <SchoolCard
                level={LEVELS[2]}
                nama={smpData.namaSekolah}
                totalSiswa={smpData.totalSiswa}
                totalKelas={smpData.totalKelas}
                absensiHariIni={smpData.absensiHariIni}
                isActive={activeLevel === 'smp'}
                onClick={() => setActiveLevel(prev => prev === 'smp' ? 'all' : 'smp')}
              />
              <SchoolCard
                level={LEVELS[3]}
                nama={smaData.namaSekolah}
                totalSiswa={smaData.totalSiswa}
                totalKelas={smaData.totalKelas}
                absensiHariIni={smaData.absensiHariIni}
                isActive={activeLevel === 'sma'}
                onClick={() => setActiveLevel(prev => prev === 'sma' ? 'all' : 'sma')}
              />
            </div>

            {/* Detail panel when a level is selected */}
            {activeLevel !== 'all' && activeSchoolData && (() => {
              const lvl = LEVELS.find(l => l.key === activeLevel)!;
              const label = lvl.label === 'SD' ? 'Sekolah Dasar' : lvl.label === 'SMP' ? 'Sekolah Menengah Pertama' : 'Sekolah Menengah Atas';
              return (
                <div className={`bg-white rounded-2xl shadow-sm border-2 ${lvl.border} p-6`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl ${lvl.light} flex items-center justify-center`}>
                      <span className={`text-sm font-black ${lvl.text}`}>{lvl.label}</span>
                    </div>
                    <h3 className="font-bold text-[#1A2332] text-lg">Detail {label}</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className={`${lvl.light} rounded-xl p-4 text-center`}>
                      <p className={`text-3xl font-black ${lvl.text}`}>{activeSchoolData.totalSiswa}</p>
                      <p className="text-xs text-gray-500 mt-1">Total Siswa</p>
                    </div>
                    <div className={`${lvl.light} rounded-xl p-4 text-center`}>
                      <p className={`text-3xl font-black ${lvl.text}`}>{activeSchoolData.totalKelas}</p>
                      <p className="text-xs text-gray-500 mt-1">Total Kelas</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-3xl font-black text-green-600">{activeSchoolData.absensiHariIni}</p>
                      <p className="text-xs text-gray-500 mt-1">Hadir Hari Ini</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-3xl font-black text-gray-600">
                        {activeSchoolData.totalSiswa > 0
                          ? Math.round((activeSchoolData.absensiHariIni / activeSchoolData.totalSiswa) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">% Kehadiran</p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <a href={`/siswa?level=${lvl.label}`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${lvl.bg} text-white hover:opacity-90 transition-opacity`}>
                      📋 Lihat Siswa {lvl.label}
                    </a>
                    <a href={`/kelas?level=${lvl.label}`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 ${lvl.border} ${lvl.text} hover:${lvl.light} transition-colors`}>
                      🏫 Lihat Kelas {lvl.label}
                    </a>
                    <a href="/absensi"
                      className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      ✅ Absensi
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* Jurnal pending alert */}
            {(kpi.pendingJurnal ?? 0) > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">📓</span>
                <div>
                  <p className="font-semibold text-yellow-800">Jurnal Guru Pending</p>
                  <p className="text-sm text-yellow-600">{kpi.pendingJurnal} jurnal menunggu review</p>
                </div>
                <a href="/jurnal-guru" className="ml-auto px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600">
                  Review
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
