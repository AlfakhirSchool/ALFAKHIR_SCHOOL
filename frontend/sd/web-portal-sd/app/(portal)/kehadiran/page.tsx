'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle, XCircle, AlertCircle, MinusCircle, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  hadir: { label: 'Hadir', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
  sakit: { label: 'Sakit', color: '#F59E0B', bg: '#FFFBEB', icon: AlertCircle },
  izin:  { label: 'Izin',  color: '#3B7FD1', bg: '#EBF2FF', icon: MinusCircle },
  alfa:  { label: 'Alfa',  color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
};

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function KehadiranPage() {
  const { user } = useAuthStore();
  const isSiswa = user?.role === 'siswa';
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const { data: siswaData } = useQuery({
    queryKey: ['portal-siswa-me'],
    queryFn: () => api.get('/siswa/me').then(r => r.data.data),
    enabled: isSiswa,
  });

  const siswaId = siswaData?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-kehadiran', siswaId, bulan, tahun],
    queryFn: () => api.get(`/absensi/${siswaId}/detail`, { params: { bulan, tahun } }).then(r => r.data),
    enabled: isSiswa && !!siswaId,
  });

  const absensi: any[] = data?.data || [];
  const rekap = { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
  absensi.forEach((a: any) => { if (rekap[a.status as keyof typeof rekap] !== undefined) rekap[a.status as keyof typeof rekap]++; });
  const total = absensi.length;
  const pctHadir = total ? Math.round((rekap.hadir / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #FF8C38 0%, #E8620D 100%)' }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/8" />
        <div className="absolute top-4 right-0 w-14 h-14 rounded-full bg-white/8" />

        <div className="px-4 pt-12 pb-6 relative">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck size={15} className="text-white/60" />
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Rekap Kehadiran</p>
          </div>

          {/* Bulan + Tahun selector */}
          <div className="flex gap-2 mb-5">
            <div className="relative flex-1">
              <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                className="w-full appearance-none bg-black/20 text-white font-bold text-sm px-4 py-2.5 rounded-2xl pr-8 focus:outline-none">
                {BULAN.map((b, i) => <option key={i} value={i + 1} className="text-gray-800 bg-white">{b}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                className="w-24 appearance-none bg-black/20 text-white font-bold text-sm px-4 py-2.5 rounded-2xl pr-8 focus:outline-none">
                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="text-gray-800 bg-white">{y}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            </div>
          </div>

          {/* % kehadiran besar */}
          <div className="flex items-end gap-3 mb-4">
            <span className="text-white font-black text-6xl leading-none">{pctHadir}</span>
            <span className="text-white/60 font-bold text-2xl mb-1">%</span>
            <span className="text-white/60 text-sm mb-1.5">kehadiran</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pctHadir}%` }} />
          </div>
        </div>

        <div className="h-6 bg-[#F0F2F5] rounded-t-[28px]" />
      </div>

      <div className="px-4 pb-28 space-y-4">

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(rekap).map(([status, count]) => {
            const { label, color, bg, icon: Icon } = STATUS_MAP[status];
            return (
              <div key={status} className="bg-white rounded-2xl p-3 flex flex-col items-center shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: bg }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="font-black text-xl leading-none text-gray-800">{count}</span>
                <span className="text-[9px] text-gray-400 font-semibold mt-1">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Detail list */}
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />)}
          </div>
        ) : absensi.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
              <CalendarCheck size={28} className="text-orange-200" />
            </div>
            <p className="font-bold text-gray-500 text-sm">Tidak ada data kehadiran</p>
            <p className="text-xs text-gray-400 mt-1">Bulan {BULAN[bulan - 1]} {tahun}</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Detail — {BULAN[bulan - 1]} {tahun}
            </p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {absensi.map((a: any, idx: number) => {
                const { label, color, bg, icon: Icon } = STATUS_MAP[a.status] || STATUS_MAP.hadir;
                return (
                  <div key={a.id} className={`px-4 py-3 flex items-center gap-3 ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      {a.mata_pelajaran?.nama && (
                        <p className="text-[10px] text-gray-400">{a.mata_pelajaran.nama}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: bg, color }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
