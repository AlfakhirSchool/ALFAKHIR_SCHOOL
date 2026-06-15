'use client';

import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalPage() {
  const { data: jadwalList, isLoading } = useQuery({
    queryKey: ['jadwal-guru'],
    queryFn: () => api.get('/jadwal-pelajaran').then(r => r.data.data || []),
  });

  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = (jadwalList || []).filter((j: any) => j.hari === day);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div>
      <Header title="Jadwal Mengajar" />
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat jadwal...</div>
        ) : (
          <div className="space-y-4">
            {DAYS.map(day => {
              const items = byDay[day];
              if (items.length === 0) return null;
              return (
                <div key={day} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-[#1B8B87]/5 border-b border-[#1B8B87]/10">
                    <h3 className="font-semibold text-[#1B8B87]">{day}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items
                      .sort((a: any, b: any) => a.jam_mulai.localeCompare(b.jam_mulai))
                      .map((j: any) => (
                        <div key={j.id} className="flex items-center justify-between px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[80px]">
                              <p className="text-sm font-bold text-[#1B8B87]">{j.jam_mulai}</p>
                              <p className="text-xs text-gray-400">{j.jam_selesai}</p>
                            </div>
                            <div className="w-px h-10 bg-gray-100" />
                            <div>
                              <p className="font-medium text-[#1A2332]">{j.mataPelajaran?.nama}</p>
                              <p className="text-sm text-gray-500">{j.kelas?.nama} · Ruang {j.ruangan}</p>
                            </div>
                          </div>
                          <span className="text-xs bg-[#1B8B87]/10 text-[#1B8B87] px-3 py-1 rounded-full font-medium">
                            {j.kelas?.tingkat}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
            {(jadwalList || []).length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <p className="text-gray-400">Belum ada jadwal mengajar</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
