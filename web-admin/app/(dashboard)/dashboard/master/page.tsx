'use client';

import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

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

const LevelRow = ({ label, color, d }: { label: string; color: string; d: any }) => {
  const pct = d.totalSiswa > 0 ? Math.round((d.absensiHariIni / d.totalSiswa) * 100) : 0;
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-black" style={{ backgroundColor: color }}>{label}</div>
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

export default function MasterDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-v2'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
    refetchInterval: 15000,
  });

  const kpi = data?.kpi || {};
  const s = data?.sekolah || {};
  const sd  = s.sd  || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const smp = s.smp || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const sma = s.sma || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };

  return (
    <div>
      <Header title="Master Monitoring" />
      <div className="p-6 space-y-6">

        <div className="bg-[#1A2332] rounded-2xl p-5 flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-bold text-white">Master Control Center</p>
            <p className="text-gray-400 text-xs">Monitoring seluruh jenjang — SD, SMP, SMA</p>
          </div>
        </div>

        {isLoading ? <div className="text-center py-20 text-gray-400">Memuat data...</div> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Siswa"    value={kpi.totalSiswa    ?? 0} icon="👨‍🎓" color="#3B7FD1" />
              <StatCard label="Total Guru"     value={kpi.totalGuru     ?? 0} icon="👨‍🏫" color="#1B8B87" />
              <StatCard label="Total Kelas"    value={kpi.totalKelas    ?? 0} icon="🏫"  color="#FF8C42" />
              <StatCard label="Hadir Hari Ini" value={kpi.absensiHariIni ?? 0} icon="✅" color="#16A34A" />
            </div>

            <h2 className="font-bold text-[#1A2332]">Kehadiran Per Jenjang</h2>

            <div className="space-y-4">
              <LevelRow label="SD"  color="#16A34A" d={sd}  />
              <LevelRow label="SMP" color="#3B7FD1" d={smp} />
              <LevelRow label="SMA" color="#9333EA" d={sma} />
            </div>

            {(kpi.pendingJurnal ?? 0) > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">📓</span>
                <div>
                  <p className="font-semibold text-yellow-800">Jurnal Guru Pending</p>
                  <p className="text-sm text-yellow-600">{kpi.pendingJurnal} jurnal menunggu review</p>
                </div>
                <a href="/jurnal-guru" className="ml-auto px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium">Review</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
