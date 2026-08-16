'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, BookOpen, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI_KERJA = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

const MAPEL_COLORS = [
  { bg: '#c4e7ff', color: '#001e2c' },
  { bg: '#dae2fd', color: '#131b2e' },
  { bg: '#ffdbc8', color: '#321200' },
  { bg: '#ffdad6', color: '#93000a' },
  { bg: '#ecfdf5', color: '#065f46' },
  { bg: '#f5f3ff', color: '#4c1d95' },
  { bg: '#fef9c3', color: '#713f12' },
  { bg: '#e0e3e5', color: '#191c1e' },
];

export default function JadwalPage() {
  const { user } = useAuthStore();
  const isSiswa = user?.role === 'siswa';

  const todayIdx = new Date().getDay();
  const todayName = HARI[todayIdx];
  const defaultDay = HARI_KERJA.includes(todayName) ? todayName : 'Senin';
  const [selectedHari, setSelectedHari] = useState(defaultDay);

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

  const jadwalAll: any[] = data || [];
  const jadwalHari = jadwalAll
    .filter(j => j.hari === selectedHari)
    .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e9e0d8] h-[60px] flex items-center gap-3 px-4">
        <Link href="/" className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
          <ChevronLeft size={20} className="text-[#191c1e]" />
        </Link>
        <div className="flex-1">
          <h1 className="font-black text-[#191c1e] text-base leading-none">Jadwal Pelajaran</h1>
          <p className="text-[11px] text-[#8b7265]">Kelas {siswaData?.kelas?.nama || '—'}</p>
        </div>
      </header>

      {/* Day picker */}
      <div className="fixed top-[60px] left-0 right-0 z-40 bg-white border-b border-[#e9e0d8] px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {HARI_KERJA.map(hari => {
            const isActive = hari === selectedHari;
            const isToday = hari === todayName;
            return (
              <button key={hari}
                onClick={() => setSelectedHari(hari)}
                className="flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: isActive ? '#f47b20' : '#f5f5f5',
                  color: isActive ? '#fff' : '#565e74',
                }}>
                <span>{hari.substring(0, 3)}</span>
                {isToday && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: isActive ? 'white' : '#f47b20' }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-[122px] pb-28 px-4 py-4 space-y-3">

        {isLoading || (isSiswa && !kelasId) ? (
          <div className="flex flex-col gap-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}</div>
        ) : jadwalHari.length === 0 ? (
          <div className="mt-6 bg-white rounded-2xl p-10 text-center shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)]">
            <div className="w-16 h-16 rounded-2xl bg-[#ffdbc8] flex items-center justify-center mx-auto mb-4">
              <BookOpen size={28} className="text-[#994700]" />
            </div>
            <p className="font-bold text-[#191c1e] text-sm">Tidak ada pelajaran</p>
            <p className="text-xs text-[#8b7265] mt-1">Hari {selectedHari} libur atau belum ada jadwal</p>
          </div>
        ) : (
          jadwalHari.map((j: any, idx: number) => {
            const palette = MAPEL_COLORS[idx % MAPEL_COLORS.length];
            const showBreak = idx > 0 && j.jam_mulai && jadwalHari[idx - 1]?.jam_selesai &&
              j.jam_mulai > jadwalHari[idx - 1].jam_selesai;

            return (
              <div key={j.id}>
                {showBreak && (
                  <div className="flex items-center gap-2 px-1 my-2">
                    <div className="flex-1 border-t border-dashed border-[#dec1b1]" />
                    <span className="text-[10px] text-[#8b7265] font-medium">Istirahat</span>
                    <div className="flex-1 border-t border-dashed border-[#dec1b1]" />
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] p-4 flex items-center gap-4">
                  {/* Colored icon */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: palette.bg }}>
                    <BookOpen size={20} style={{ color: palette.color }} strokeWidth={1.8} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#191c1e] leading-snug">{j.mata_pelajaran?.nama || 'Pelajaran'}</p>
                    <p className="text-[11px] text-[#8b7265] mt-0.5">{j.guru?.user?.nama || ''}</p>
                    {j.ruangan && (
                      <p className="text-[10px] text-[#8b7265]">Ruang {j.ruangan}</p>
                    )}
                  </div>

                  {/* Time pill */}
                  {j.jam_mulai && (
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 bg-[#ffdbc8] px-2.5 py-1 rounded-full">
                        <Clock size={10} className="text-[#994700]" />
                        <span className="text-[11px] font-bold text-[#994700]">{j.jam_mulai}</span>
                      </div>
                      {j.jam_selesai && (
                        <span className="text-[10px] text-[#8b7265]">{j.jam_selesai}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
