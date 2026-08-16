'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle, XCircle, AlertCircle, MinusCircle, ChevronDown, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  hadir: { label: 'Hadir', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
  sakit: { label: 'Sakit', color: '#F59E0B', bg: '#FFFBEB', icon: AlertCircle },
  izin:  { label: 'Izin',  color: '#6366F1', bg: '#EEF2FF', icon: MinusCircle },
  alfa:  { label: 'Alfa',  color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
};

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function DonutChart({ pct }: { pct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* bg track */}
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="14" />
      {/* colored arc */}
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke="white" strokeWidth="14"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      {/* center text */}
      <text x="70" y="62" textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="system-ui">{pct}</text>
      <text x="70" y="80" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11" fontWeight="700" fontFamily="system-ui">% Hadir</text>
    </svg>
  );
}

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
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #FF8C38 0%, #c45c0a 100%)' }}>
        {/* decorative circles */}
        <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-white/8" />
        <div className="absolute top-6 right-8 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute bottom-12 -left-10 w-40 h-40 rounded-full bg-black/8" />

        <div className="px-4 pt-12 pb-4 relative">
          {/* Top bar */}
          <div className="flex items-center gap-3 mb-6">
            <Link href="/" className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronLeft size={18} className="text-white" />
            </Link>
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Rekap Kehadiran</p>
              <p className="text-white font-black text-lg leading-none">{siswaData?.kelas?.nama || ''}</p>
            </div>
          </div>

          {/* Donut + selectors row */}
          <div className="flex items-center gap-4">
            <DonutChart pct={pctHadir} />

            <div className="flex-1 space-y-2.5">
              {/* bulan selector */}
              <div className="relative">
                <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                  className="w-full appearance-none bg-white/20 text-white font-bold text-sm px-4 py-2.5 rounded-2xl pr-8 focus:outline-none">
                  {BULAN.map((b, i) => <option key={i} value={i + 1} className="text-gray-800 bg-white">{b}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
              </div>
              {/* tahun selector */}
              <div className="relative">
                <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                  className="w-full appearance-none bg-white/20 text-white font-bold text-sm px-4 py-2.5 rounded-2xl pr-8 focus:outline-none">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y} className="text-gray-800 bg-white">{y}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
              </div>
              {/* total pertemuan */}
              <div className="bg-white/15 rounded-2xl px-4 py-2 text-center">
                <p className="text-white font-black text-xl leading-none">{total}</p>
                <p className="text-white/60 text-[10px] font-semibold">Total Pertemuan</p>
              </div>
            </div>
          </div>

          {/* mini bar per status */}
          {total > 0 && (
            <div className="mt-4 flex rounded-full overflow-hidden h-2">
              {Object.entries(rekap).map(([status, count]) => {
                const w = total ? (count / total) * 100 : 0;
                const colors: Record<string, string> = { hadir: '#10B981', sakit: '#F59E0B', izin: '#6366F1', alfa: '#EF4444' };
                return w > 0 ? <div key={status} style={{ width: `${w}%`, background: colors[status] }} /> : null;
              })}
            </div>
          )}
        </div>

        <div className="h-6 bg-[#F0F2F5] rounded-t-[28px] mt-4" />
      </div>

      <div className="px-4 pb-28 space-y-4 -mt-2">

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(rekap).map(([status, count]) => {
            const { label, color, bg, icon: Icon } = STATUS_MAP[status];
            return (
              <div key={status} className="bg-white rounded-2xl p-3 flex flex-col items-center shadow-sm relative overflow-hidden">
                <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full opacity-10" style={{ background: color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: bg }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="font-black text-2xl leading-none" style={{ color }}>{count}</span>
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
                const s = STATUS_MAP[a.status] || STATUS_MAP.hadir;
                const Icon = s.icon;
                const tgl = new Date(a.tanggal);
                const isValid = !isNaN(tgl.getTime());
                return (
                  <div key={a.id} className={`px-4 py-3.5 flex items-center gap-3 ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
                    {/* date badge */}
                    <div className="w-10 flex-shrink-0 text-center">
                      <p className="text-base font-black text-gray-800 leading-none">
                        {isValid ? tgl.getDate() : '—'}
                      </p>
                      <p className="text-[9px] text-gray-400 font-semibold uppercase">
                        {isValid ? tgl.toLocaleDateString('id-ID', { month: 'short' }) : ''}
                      </p>
                    </div>
                    {/* divider line */}
                    <div className="w-px h-8 bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {isValid ? tgl.toLocaleDateString('id-ID', { weekday: 'long' }) : '—'}
                      </p>
                      {a.jadwal?.mata_pelajaran?.nama && (
                        <p className="text-[10px] text-gray-400">{a.jadwal.mata_pelajaran.nama}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 rounded-full"
                      style={{ background: s.bg }}>
                      <Icon size={11} style={{ color: s.color }} />
                      <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</span>
                    </div>
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
