'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Wallet, TrendingUp, TrendingDown, AlertCircle, ArrowRight,
  CheckCircle2, Clock, Zap, Plus, BookOpen, Target, Bot,
  GraduationCap, Landmark, FileText, School, Building2,
  BarChart3, CalendarDays, Users,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
const fmtShort = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} jt`
  : v >= 1_000 ? `${(v / 1_000).toFixed(0)} rb` : String(v);

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

const JENIS_ICON: Record<string, any> = {
  SPP: BookOpen, Panahan: Target, Robotik: Bot,
  UKT: GraduationCap, 'Uang Masuk': Landmark, 'Formulir Pendaftaran': FileText,
  Ekskul: School, 'Ekskul Kelas 9': School,
};

const nowM = new Date().getMonth() + 1;
const nowY = new Date().getFullYear();

// ── Simple SVG bar chart ─────────────────────────────────────────────────────
function TrendChart({ data }: { data: { bulan: number; tipe: string; total: number }[] }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-32 text-gray-300 text-sm">Belum ada data transaksi</div>
  );

  const byBulan: Record<number, { in: number; out: number }> = {};
  data.forEach(d => {
    if (!byBulan[d.bulan]) byBulan[d.bulan] = { in: 0, out: 0 };
    if (d.tipe === 'pemasukan') byBulan[d.bulan].in += Number(d.total);
    else byBulan[d.bulan].out += Number(d.total);
  });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const maxVal = Math.max(...Object.values(byBulan).flatMap(v => [v.in, v.out]), 1);
  const H = 80;
  const W = 28;
  const gap = 6;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 min-w-max px-1 pb-1">
        {months.map(m => {
          const d = byBulan[m] || { in: 0, out: 0 };
          const hIn = Math.round((d.in / maxVal) * H);
          const hOut = Math.round((d.out / maxVal) * H);
          const isNow = m === nowM;
          return (
            <div key={m} className="flex flex-col items-center gap-0.5">
              <div className="flex items-end gap-0.5" style={{ height: H }}>
                <div
                  style={{ height: hIn || 2, width: W / 2 - 1 }}
                  className={`rounded-t transition-all ${isNow ? 'bg-emerald-500' : 'bg-emerald-300'}`}
                  title={`Pemasukan ${BULAN[m-1]}: ${fmt(d.in)}`} />
                <div
                  style={{ height: hOut || 2, width: W / 2 - 1 }}
                  className={`rounded-t transition-all ${isNow ? 'bg-red-400' : 'bg-red-200'}`}
                  title={`Pengeluaran ${BULAN[m-1]}: ${fmt(d.out)}`} />
              </div>
              <span className={`text-[9px] font-medium ${isNow ? 'text-blue-600' : 'text-gray-400'}`}>{BULAN[m-1]}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 px-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-emerald-400" /><span className="text-xs text-gray-400">Pemasukan</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-red-300" /><span className="text-xs text-gray-400">Pengeluaran</span></div>
      </div>
    </div>
  );
}

// ── Overdue badge ─────────────────────────────────────────────────────────────
function DueBadge({ date }: { date: string }) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Lewat {-days}h</span>;
  if (days === 0) return <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Hari ini</span>;
  if (days <= 7) return <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{days} hari lagi</span>;
  return <span className="text-xs text-gray-400">{new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>;
}

export default function DashboardKeuanganPage() {
  const { data: laporan } = useQuery({
    queryKey: ['keuangan-laporan'],
    queryFn: () => api.get('/pembayaran/laporan').then(r => r.data),
  });

  const { data: belumBayar } = useQuery({
    queryKey: ['keuangan-belum'],
    queryFn: () => api.get('/pembayaran', { params: { status: 'belum_bayar', limit: 8 } }).then(r => r.data),
  });

  const { data: baruLunas } = useQuery({
    queryKey: ['keuangan-lunas'],
    queryFn: () => api.get('/pembayaran', { params: { status: 'lunas', limit: 5 } }).then(r => r.data),
  });

  const { data: rekapBulan } = useQuery({
    queryKey: ['keuangan-rekap-bulan', nowM, nowY],
    queryFn: () => api.get('/keuangan/transaksi/rekap', { params: { bulan: nowM, tahun: nowY } }).then(r => r.data?.data),
    staleTime: 60_000,
  });

  const { data: rekapTahun } = useQuery({
    queryKey: ['keuangan-rekap-tahun', nowY],
    queryFn: () => api.get('/keuangan/transaksi/rekap', { params: { tahun: nowY } }).then(r => r.data?.data),
    staleTime: 120_000,
  });

  const { data: rekapSD } = useQuery({
    queryKey: ['keuangan-rekap-sd', nowM, nowY],
    queryFn: () => api.get('/keuangan/transaksi/rekap', { params: { bulan: nowM, tahun: nowY, unit: 'SD' } }).then(r => r.data?.data),
    staleTime: 120_000,
  });

  const { data: rekapSMP } = useQuery({
    queryKey: ['keuangan-rekap-smp', nowM, nowY],
    queryFn: () => api.get('/keuangan/transaksi/rekap', { params: { bulan: nowM, tahun: nowY, unit: 'SMP' } }).then(r => r.data?.data),
    staleTime: 120_000,
  });

  const summary = laporan?.summary || {};
  const pct = summary.total_tagihan > 0 ? Math.round((summary.total_terbayar / summary.total_tagihan) * 100) : 0;
  const belumList: any[] = belumBayar?.data || [];
  const lunasList: any[] = baruLunas?.data || [];
  const tSummary = rekapBulan?.summary;
  const perKategori: any[] = (rekapBulan?.per_kategori || []).filter((k: any) => k.tipe === 'pemasukan');
  const trendBulan: any[] = rekapTahun?.trend_bulan || [];

  // Upcoming due (≤14 hari)
  const upcoming = belumList
    .filter(p => p.tanggal_jatuh_tempo)
    .sort((a, b) => new Date(a.tanggal_jatuh_tempo).getTime() - new Date(b.tanggal_jatuh_tempo).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50/80">
      <Header title="Dashboard Keuangan" />
      <div className="p-5 max-w-7xl mx-auto space-y-5">

        {/* ── Quick actions ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2.5">
          <Link href="/pembayaran"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold text-sm shadow-sm shadow-emerald-100 transition-all">
            <Zap size={15} /> Catat Pembayaran
          </Link>
          <Link href="/pembayaran"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm shadow-sm shadow-blue-100 transition-all">
            <Plus size={15} /> Buat Tagihan
          </Link>
          <Link href="/transaksi"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-semibold text-sm shadow-sm shadow-amber-100 transition-all">
            <BarChart3 size={15} /> Transaksi Kas
          </Link>
          <Link href="/laporan"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition-all">
            <FileText size={15} /> Laporan
          </Link>
        </div>

        {/* ── Stat cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Tagihan', val: summary.total_tagihan, icon: Wallet, color: 'text-slate-700', bg: 'bg-slate-50', ring: 'ring-slate-200' },
            { label: 'Sudah Terbayar', val: summary.total_terbayar, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
            { label: 'Tunggakan', val: summary.total_tunggakan, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200' },
          ].map(({ label, val, icon: Icon, color, bg, ring }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center ring-1 ${ring}`}>
                  <Icon size={17} className={color} />
                </div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
              </div>
              <p className={`text-2xl font-black ${color}`}>{fmt(val || 0)}</p>
            </div>
          ))}
        </div>

        {/* ── Progress + Kas Operasional ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-800 text-sm">Progress Pembayaran Siswa</h3>
              <span className="text-lg font-black text-blue-600">{pct}%</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">{fmt(summary.total_terbayar || 0)} terkumpul dari {fmt(summary.total_tagihan || 0)}</p>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <CheckCircle2 size={16} className="text-emerald-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Lunas</p>
                <p className="text-sm font-bold text-emerald-700">{lunasList.length > 0 ? lunasList.length : '—'}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <Clock size={16} className="text-red-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Belum Bayar</p>
                <p className="text-sm font-bold text-red-600">{belumBayar?.pagination?.total ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Kas operasional bulan ini */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Kas Operasional</h3>
                <p className="text-xs text-gray-400">{BULAN[nowM - 1]} {nowY}</p>
              </div>
              <Link href="/transaksi" className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                Kelola <ArrowRight size={11} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Pemasukan', val: tSummary?.total_pemasukan, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Pengeluaran', val: tSummary?.total_pengeluaran, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Saldo', val: tSummary?.saldo, icon: Wallet, color: (tSummary?.saldo || 0) >= 0 ? 'text-amber-600' : 'text-red-600', bg: (tSummary?.saldo || 0) >= 0 ? 'bg-amber-50' : 'bg-red-50' },
              ].map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className={`text-center p-3 ${bg} rounded-xl`}>
                  <Icon size={15} className={`${color} mx-auto mb-1`} />
                  <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                  <p className={`text-xs font-bold ${color} mt-0.5`}>Rp {fmtShort(val || 0)}</p>
                </div>
              ))}
            </div>
            {/* SD vs SMP mini breakdown */}
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              {[
                { unit: 'SD', data: rekapSD?.summary, icon: School, color: 'text-sky-600 bg-sky-50' },
                { unit: 'SMP', data: rekapSMP?.summary, icon: Building2, color: 'text-violet-600 bg-violet-50' },
              ].map(({ unit, data: d, icon: Icon, color }) => (
                <div key={unit} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color.split(' ')[1]}`}>
                    <Icon size={13} className={color.split(' ')[0]} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">{unit}</p>
                    <p className="text-xs font-bold text-gray-800">Rp {fmtShort(d?.total_pemasukan || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bar chart trend ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Tren Kas {nowY}</h3>
              <p className="text-xs text-gray-400">Pemasukan vs Pengeluaran per bulan</p>
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${(rekapTahun?.summary?.saldo || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              Saldo Tahun: Rp {fmtShort(Math.abs(rekapTahun?.summary?.saldo || 0))}
              {(rekapTahun?.summary?.saldo || 0) < 0 ? ' (defisit)' : ''}
            </div>
          </div>
          <TrendChart data={trendBulan} />
        </div>

        {/* ── Rekap per jenis biaya + Jatuh tempo ──────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Per kategori pemasukan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Rekap Pemasukan Bulan Ini</h3>
              <p className="text-xs text-gray-400">Per kategori · {BULAN[nowM - 1]} {nowY}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {perKategori.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">Belum ada transaksi bulan ini</p>
              ) : perKategori.map((k: any) => {
                const Icon = JENIS_ICON[k.kategori] || Wallet;
                const pctKat = tSummary?.total_pemasukan > 0 ? Math.round((Number(k.total) / tSummary.total_pemasukan) * 100) : 0;
                return (
                  <div key={`${k.kategori}-${k.unit}`} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Icon size={13} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{k.kategori}</p>
                          <p className="text-xs text-gray-400">{k.unit} · {k.jumlah_transaksi}x</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">{fmt(Number(k.total))}</p>
                        <p className="text-xs text-gray-400">{pctKat}%</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full" style={{ width: `${pctKat}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jatuh tempo & belum lunas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Tagihan Belum Lunas</h3>
                <p className="text-xs text-gray-400">Urutkan dari jatuh tempo terdekat</p>
              </div>
              <Link href="/pembayaran?status=belum_bayar"
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                Semua <ArrowRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {belumList.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">Semua tagihan lunas 🎉</p>
              ) : belumList.slice(0, 6).map((p: any) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{(p.siswa?.user?.nama || '?')[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.siswa?.user?.nama}</p>
                      <p className="text-xs text-gray-400 truncate">{p.jenis_biaya}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-bold text-gray-700">{fmt(p.nominal_biaya - p.nominal_terbayar)}</p>
                    {p.tanggal_jatuh_tempo
                      ? <DueBadge date={p.tanggal_jatuh_tempo} />
                      : <span className="text-xs text-gray-300">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Baru lunas ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Baru Lunas</h3>
              <p className="text-xs text-gray-400">5 pembayaran terbaru</p>
            </div>
            <Link href="/pembayaran?status=lunas" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1">
              Semua <ArrowRight size={11} />
            </Link>
          </div>
          {lunasList.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Belum ada pembayaran lunas</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
              {lunasList.map((p: any) => (
                <div key={p.id} className="px-4 py-3 text-center">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-1.5">
                    <span className="text-white text-sm font-bold">{(p.siswa?.user?.nama || '?')[0]}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.siswa?.user?.nama?.split(' ')[0]}</p>
                  <p className="text-[10px] text-gray-400 truncate">{p.jenis_biaya}</p>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">Rp {fmtShort(p.nominal_terbayar)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
