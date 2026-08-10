'use client';

import Link from 'next/link';
import { ChevronLeft, Clock, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI_ORDER = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

export default function JadwalPage() {
  const { user } = useAuthStore();
  const isSiswa = user?.role === 'siswa';

  const { data: siswaData } = useQuery({
    queryKey: ['portal-siswa-me'],
    queryFn: () => api.get('/siswa/me').then(r => r.data.data),
    enabled: isSiswa,
  });

  const kelasId = siswaData?.kelas_id;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-jadwal', kelasId],
    queryFn: () => api.get('/jadwal-pelajaran', { params: { kelas_id: kelasId } }).then(r => r.data.data ?? []),
    enabled: !!kelasId,
  });

  const jadwalList: any[] = data || [];

  // Group by hari
  const grouped = HARI_ORDER.reduce((acc, h) => {
    acc[h] = jadwalList.filter(j => j.hari === h).sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));
    return acc;
  }, {} as Record<string, any[]>);

  const todayIdx = new Date().getDay();
  const todayName = HARI[todayIdx];

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #06B6D4 0%, #0891B2 100%)' }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/8" />
        <div className="absolute top-4 right-0 w-14 h-14 rounded-full bg-white/8" />
        <div className="px-4 pt-12 pb-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronLeft size={18} className="text-white" />
            </Link>
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Kelas {siswaData?.kelas?.nama || ''}</p>
              <h1 className="text-white font-black text-2xl leading-none">Jadwal Pelajaran</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-2xl px-4 py-2.5 w-fit">
            <Clock size={13} className="text-white/70" />
            <span className="text-white text-xs font-semibold">Hari ini: {todayName}</span>
          </div>
        </div>
        <div className="h-6 bg-[#F0F2F5] rounded-t-[28px]" />
      </div>

      <div className="px-4 pb-28 space-y-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}</div>
        ) : jadwalList.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-cyan-200" />
            </div>
            <p className="font-bold text-gray-500 text-sm">Belum ada jadwal</p>
            <p className="text-xs text-gray-400 mt-1">Jadwal pelajaran belum diatur</p>
          </div>
        ) : (
          HARI_ORDER.filter(h => grouped[h]?.length > 0).map(hari => (
            <div key={hari}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <p className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: hari === todayName ? '#06B6D4' : '#9CA3AF' }}>
                  {hari}
                </p>
                {hari === todayName && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600">Hari ini</span>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {grouped[hari].map((j: any, idx: number) => (
                  <div key={j.id} className={`px-4 py-3.5 flex items-center gap-3 ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={15} className="text-cyan-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800">{j.mata_pelajaran?.nama || 'Pelajaran'}</p>
                      <p className="text-[10px] text-gray-400">{j.guru?.nama || ''}</p>
                    </div>
                    {j.jam_mulai && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-gray-700">{j.jam_mulai}</p>
                        {j.jam_selesai && <p className="text-[10px] text-gray-400">{j.jam_selesai}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
