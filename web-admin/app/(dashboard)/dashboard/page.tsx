'use client';

import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

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

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
  });

  const kpi = data?.kpi || {};

  return (
    <div>
      <Header title="Dashboard Admin" />
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat data...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <KpiCard title="Total Siswa" value={kpi.totalSiswa || 0} icon="👨‍🎓" color="border-[#3B7FD1]" />
              <KpiCard title="Total Guru" value={kpi.totalGuru || 0} icon="👨‍🏫" color="border-[#1B8B87]" />
              <KpiCard title="Total Kelas" value={kpi.totalKelas || 0} icon="🏫" color="border-[#FF8C42]" />
              <KpiCard title="Hadir Hari Ini" value={kpi.absensiHariIni || 0} icon="✅" color="border-green-500" />
              <KpiCard title="Jurnal Pending" value={kpi.pendingJurnal || 0} icon="📓" color="border-yellow-500" />
              <KpiCard title="Tunggakan" value={kpi.tunggakanCount || 0} icon="💰" color="border-red-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-[#1A2332] mb-4">Aktivitas Terbaru</h3>
                <div className="text-sm text-gray-500 text-center py-8">
                  Data aktivitas akan tampil di sini
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-[#1A2332] mb-4">Status Pembayaran</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Lunas
                    </span>
                    <span className="font-semibold text-green-600">-</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span> Sebagian
                    </span>
                    <span className="font-semibold text-yellow-600">-</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Belum Bayar
                    </span>
                    <span className="font-semibold text-red-600">{kpi.tunggakanCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
