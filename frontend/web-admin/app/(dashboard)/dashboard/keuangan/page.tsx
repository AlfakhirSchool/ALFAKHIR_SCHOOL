'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, [string, string]> = {
    lunas:      ['bg-green-100 text-green-700', 'Lunas'],
    sebagian:   ['bg-yellow-100 text-yellow-700', 'Sebagian'],
    belum_bayar:['bg-red-100 text-red-700', 'Belum Bayar'],
  };
  const [cls, label] = map[status] || ['bg-gray-100 text-gray-600', status];
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
};

const nowM = new Date().getMonth() + 1;
const nowY = new Date().getFullYear();

export default function DashboardKeuanganPage() {
  const { data: laporan } = useQuery({
    queryKey: ['keuangan-laporan'],
    queryFn: () => api.get('/pembayaran/laporan').then(r => r.data),
  });
  const { data: belumBayar } = useQuery({
    queryKey: ['keuangan-belum'],
    queryFn: () => api.get('/pembayaran', { params: { status: 'belum_bayar', limit: 10 } }).then(r => r.data),
  });
  const { data: baru } = useQuery({
    queryKey: ['keuangan-lunas'],
    queryFn: () => api.get('/pembayaran', { params: { status: 'lunas', limit: 10 } }).then(r => r.data),
  });
  const { data: rekapTransaksi } = useQuery({
    queryKey: ['keuangan-rekap-transaksi', nowM, nowY],
    queryFn: () => api.get('/keuangan/transaksi/rekap', { params: { bulan: nowM, tahun: nowY } }).then(r => r.data?.data),
    staleTime: 60_000,
  });

  const summary = laporan?.summary || { total_tagihan: 0, total_terbayar: 0, total_tunggakan: 0 };
  const pct = summary.total_tagihan > 0 ? Math.round((summary.total_terbayar / summary.total_tagihan) * 100) : 0;
  const belumList: any[] = belumBayar?.data || [];
  const lunasList: any[] = baru?.data || [];
  const tSummary = rekapTransaksi?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Dashboard Keuangan" />
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Rekap pembayaran & tagihan siswa</p>
          <Link href="/pembayaran"
            className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-lg transition-colors">
            Kelola Pembayaran <ArrowRight size={14} />
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Tagihan', value: fmt(summary.total_tagihan), icon: Wallet, color: 'text-slate-600', bg: 'bg-slate-50' },
            { label: 'Sudah Terbayar', value: fmt(summary.total_terbayar), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Tunggakan', value: fmt(summary.total_tunggakan), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Terkumpul</span>
            <span className="text-sm font-black text-teal-600">{pct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{fmt(summary.total_terbayar)} dari {fmt(summary.total_tagihan)}</p>
        </div>

        {/* Transaksi bulan ini */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Kas Operasional Bulan Ini</h3>
              <p className="text-xs text-gray-400">SPP, Ekskul, UKT, Pengeluaran, dll.</p>
            </div>
            <Link href="/transaksi"
              className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
              Kelola <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <TrendingUp size={16} className="text-green-600 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Pemasukan</p>
              <p className="text-sm font-bold text-green-700">{fmt(tSummary?.total_pemasukan || 0)}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <TrendingDown size={16} className="text-red-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Pengeluaran</p>
              <p className="text-sm font-bold text-red-600">{fmt(tSummary?.total_pengeluaran || 0)}</p>
            </div>
            <div className={`text-center p-3 rounded-xl ${(tSummary?.saldo || 0) >= 0 ? 'bg-amber-50' : 'bg-red-50'}`}>
              <Wallet size={16} className="text-amber-600 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Saldo</p>
              <p className={`text-sm font-bold ${(tSummary?.saldo || 0) >= 0 ? 'text-amber-700' : 'text-red-600'}`}>{fmt(tSummary?.saldo || 0)}</p>
            </div>
          </div>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Belum lunas */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Belum Lunas</h3>
              <p className="text-xs text-gray-400">10 tagihan terbaru</p>
            </div>
            <div className="divide-y divide-gray-50">
              {belumList.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Semua tagihan lunas 🎉</p>
              ) : belumList.map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.siswa?.user?.nama || p.siswa_id}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{p.jenis_biaya}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-700">{fmt(p.nominal_biaya)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Baru lunas */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Baru Lunas</h3>
              <p className="text-xs text-gray-400">10 pembayaran terbaru</p>
            </div>
            <div className="divide-y divide-gray-50">
              {lunasList.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Belum ada pembayaran lunas</p>
              ) : lunasList.map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.siswa?.user?.nama || p.siswa_id}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{p.jenis_biaya}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-600">{fmt(p.nominal_terbayar)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
