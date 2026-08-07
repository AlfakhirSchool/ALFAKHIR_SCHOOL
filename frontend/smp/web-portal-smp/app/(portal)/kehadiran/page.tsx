'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle, XCircle, AlertCircle, MinusCircle } from 'lucide-react';
import api from '@/lib/api';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  hadir: { label: 'Hadir',  color: '#10B981', icon: CheckCircle },
  sakit: { label: 'Sakit',  color: '#F59E0B', icon: AlertCircle },
  izin:  { label: 'Izin',   color: '#3B7FD1', icon: MinusCircle },
  alfa:  { label: 'Alfa',   color: '#EF4444', icon: XCircle },
};

export default function KehadiranPage() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['portal-kehadiran', bulan, tahun],
    queryFn: () => api.get('/absensi', { params: { bulan, tahun, limit: 100 } }).then(r => r.data),
  });

  const absensi: any[] = data?.data || [];

  const rekap = { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
  absensi.forEach((a: any) => { if (rekap[a.status as keyof typeof rekap] !== undefined) rekap[a.status as keyof typeof rekap]++; });
  const total = absensi.length;
  const pctHadir = total ? Math.round((rekap.hadir / total) * 100) : 0;

  const bulanNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">Kehadiran</h1>

      {/* Bulan filter */}
      <div className="flex gap-2">
        <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B3C]">
          {bulanNames.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
        </select>
        <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B3C]">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Rekap */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm text-gray-800">Rekap {bulanNames[bulan - 1]} {tahun}</p>
          <span className="text-2xl font-bold text-[#10B981]">{pctHadir}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div className="h-2 rounded-full bg-[#10B981]" style={{ width: `${pctHadir}%` }} />
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {Object.entries(rekap).map(([status, count]) => {
            const { label, color, icon: Icon } = STATUS_MAP[status];
            return (
              <div key={status} className="space-y-1">
                <Icon size={18} style={{ color }} className="mx-auto" />
                <p className="text-xl font-bold text-gray-800">{count}</p>
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail per hari */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Memuat...</div>
      ) : absensi.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CalendarCheck size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Tidak ada data kehadiran bulan ini</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="font-semibold text-sm text-gray-800">Detail Kehadiran</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {absensi.map((a: any) => {
              const { label, color, icon: Icon } = STATUS_MAP[a.status] || STATUS_MAP.hadir;
              return (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-800">
                      {new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {a.mata_pelajaran?.nama && (
                      <p className="text-xs text-gray-400">{a.mata_pelajaran.nama}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5" style={{ color }}>
                    <Icon size={14} />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
