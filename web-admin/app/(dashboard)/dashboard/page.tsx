'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Header from '@/components/layout/Header';

const SCHOOLS = [
  {
    key: 'sd',
    label: 'SD',
    fullName: 'Sekolah Dasar',
    desc: 'Kelola siswa, kelas, absensi, dan nilai jenjang SD',
    color: '#16A34A',
    gradient: 'from-green-500 to-green-700',
    light: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-700',
    icon: '🏫',
    href: '/dashboard/sd',
  },
  {
    key: 'smp',
    label: 'SMP',
    fullName: 'Sekolah Menengah Pertama',
    desc: 'Kelola siswa, kelas, absensi, dan nilai jenjang SMP',
    color: '#3B7FD1',
    gradient: 'from-blue-500 to-blue-700',
    light: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-700',
    icon: '🏫',
    href: '/dashboard/smp',
  },
  {
    key: 'sma',
    label: 'SMA',
    fullName: 'Sekolah Menengah Atas',
    desc: 'Kelola siswa, kelas, absensi, dan nilai jenjang SMA',
    color: '#9333EA',
    gradient: 'from-purple-500 to-purple-700',
    light: 'bg-purple-50',
    border: 'border-purple-400',
    text: 'text-purple-700',
    icon: '🏫',
    href: '/dashboard/sma',
  },
] as const;

export default function DashboardSelectPage() {
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['admin-dashboard-v2'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
  });

  const sekolah = data?.sekolah || {};

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <Header title="Pilih Dashboard" />
      <div className="flex flex-col items-center justify-center px-6 py-16">

        {/* Judul */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black text-[#1A2332] mb-3">Masuk ke Dashboard</h1>
          <p className="text-gray-400 text-base">Pilih jenjang yang ingin Anda kelola</p>
        </div>

        {/* 3 Kartu Pilihan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {SCHOOLS.map((s) => {
            const d = sekolah[s.key] || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
            return (
              <button
                key={s.key}
                onClick={() => router.push(s.href)}
                className="group bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-opacity-60 text-left"
                style={{ '--hover-border': s.color } as React.CSSProperties}
              >
                {/* Banner warna */}
                <div className={`bg-gradient-to-br ${s.gradient} p-8 flex flex-col items-center text-white`}>
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                    <span className="text-4xl font-black">{s.label}</span>
                  </div>
                  <h2 className="text-xl font-bold text-center">{s.fullName}</h2>
                </div>

                {/* Stats */}
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className={`${s.light} rounded-xl p-3 text-center`}>
                      <p className={`text-xl font-black ${s.text}`}>{d.totalSiswa}</p>
                      <p className="text-xs text-gray-500">Siswa</p>
                    </div>
                    <div className={`${s.light} rounded-xl p-3 text-center`}>
                      <p className={`text-xl font-black ${s.text}`}>{d.totalKelas}</p>
                      <p className="text-xs text-gray-500">Kelas</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-green-600">{d.absensiHariIni}</p>
                      <p className="text-xs text-gray-500">Hadir</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mb-5 text-center">{s.desc}</p>

                  <div className={`w-full py-3 rounded-xl text-white text-sm font-bold text-center bg-gradient-to-r ${s.gradient} group-hover:opacity-90 transition-opacity`}>
                    Masuk Dashboard {s.label} →
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Link tersembunyi ke master monitoring */}
        <div className="mt-16">
          <button
            onClick={() => router.push('/dashboard/master')}
            className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
          >
            ···
          </button>
        </div>
      </div>
    </div>
  );
}
