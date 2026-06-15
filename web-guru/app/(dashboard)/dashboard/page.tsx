'use client';

import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const KpiCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) => (
  <div className={`bg-white rounded-xl p-6 border-l-4 ${color} shadow-sm`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-[#1A2332] mt-1">{value}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

export default function DashboardGuruPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['guru-dashboard'],
    queryFn: () => api.get('/dashboard/guru').then(r => r.data.data),
  });

  const kpi = data?.kpi || {};
  const jadwalHariIni = data?.jadwalHariIni || [];
  const pendingJurnal = data?.pendingJurnal || [];

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <Header title="Dashboard Guru" />
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1A2332]">Selamat datang, {user?.nama} 👋</h2>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat data...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard title="Kelas Saya" value={kpi.totalKelas || 0} icon="🏫" color="border-[#1B8B87]" />
              <KpiCard title="Jadwal Hari Ini" value={kpi.jadwalHariIni || 0} icon="📅" color="border-[#3B7FD1]" />
              <KpiCard title="Jurnal Pending" value={kpi.jurnalPending || 0} icon="📓" color="border-yellow-500" />
              <KpiCard title="Nilai Belum Input" value={kpi.nilaiPending || 0} icon="📝" color="border-[#FF8C42]" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-[#1A2332] mb-4 flex items-center gap-2">
                  <span>📅</span> Jadwal Hari Ini
                </h3>
                {jadwalHariIni.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Tidak ada jadwal hari ini</p>
                ) : (
                  <div className="space-y-3">
                    {jadwalHariIni.map((j: any) => (
                      <div key={j.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm text-[#1A2332]">{j.mataPelajaran?.nama}</p>
                          <p className="text-xs text-gray-500">{j.kelas?.nama} · {j.ruangan}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#1B8B87]">{j.jam_mulai} - {j.jam_selesai}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-[#1A2332] mb-4 flex items-center gap-2">
                  <span>📓</span> Jurnal Belum Disubmit
                </h3>
                {pendingJurnal.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Semua jurnal sudah disubmit</p>
                ) : (
                  <div className="space-y-3">
                    {pendingJurnal.map((j: any) => (
                      <div key={j.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <div>
                          <p className="font-medium text-sm text-[#1A2332]">{j.topik_pelajaran}</p>
                          <p className="text-xs text-gray-500">{j.kelas?.nama} · {new Date(j.tanggal).toLocaleDateString('id-ID')}</p>
                        </div>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Draft</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
