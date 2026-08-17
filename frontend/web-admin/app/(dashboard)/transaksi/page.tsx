'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, TrendingUp, TrendingDown, Wallet, Filter, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, Search, User, Download, PiggyBank, Heart,
  LayoutGrid, ArrowDownCircle, ArrowUpCircle, School, Building2,
  Calendar, Receipt,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const KATEGORI_SISWA = ['SPP', 'Ekskul', 'UKT', 'Formulir Pendaftaran', 'Tabungan'];
const KATEGORI_PEMASUKAN = ['SPP', 'Ekskul', 'UKT', 'Uang Masuk', 'Formulir Pendaftaran', 'Tabungan', 'Infak Qurban', 'Lainnya'];
const KATEGORI_PENGELUARAN = ['Pengeluaran Harian', 'Pengeluaran SD', 'Pengeluaran SMP', 'Pembayaran Kas & Transfer', 'Tabungan', 'Lainnya'];
const SUB_EKSKUL = ['Panahan', 'Robotik', 'Ekskul Kelas 9', 'Lainnya'];
const UNIT_LIST = ['SD', 'SMP', 'Umum'];
const METODE_LIST = ['tunai', 'transfer', 'qris'];

const now = new Date();
const EMPTY_FORM = {
  tanggal: now.toISOString().split('T')[0],
  tipe: 'pemasukan' as 'pemasukan' | 'pengeluaran',
  kategori: '',
  sub_kategori: '',
  unit: 'Umum',
  jumlah: '',
  keterangan: '',
  metode: 'tunai',
  nama_pihak: '',
};

type Transaksi = {
  id: string; tanggal: string; tipe: 'pemasukan' | 'pengeluaran';
  kategori: string; sub_kategori: string | null; unit: string;
  jumlah: number; keterangan: string | null; metode: string; nama_pihak: string | null; created_at: string;
};

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
const fmtShort = (v: number) =>
  v >= 1_000_000 ? `Rp ${(v / 1_000_000).toFixed(1)} jt` : v >= 1_000 ? `Rp ${(v / 1_000).toFixed(0)} rb` : `Rp ${v}`;

const bulanNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

type QuickTab = 'semua' | 'pemasukan' | 'pengeluaran' | 'tabungan' | 'infak';

const QUICK_TABS: { id: QuickTab; label: string; icon: any; color: string }[] = [
  { id: 'semua',      label: 'Semua',         icon: LayoutGrid,      color: 'text-gray-600'   },
  { id: 'pemasukan',  label: 'Pemasukan',      icon: ArrowUpCircle,   color: 'text-green-600'  },
  { id: 'pengeluaran',label: 'Pengeluaran',    icon: ArrowDownCircle, color: 'text-red-500'    },
  { id: 'tabungan',   label: 'Tabungan',       icon: PiggyBank,       color: 'text-sky-600'    },
  { id: 'infak',      label: 'Infak Qurban',   icon: Heart,           color: 'text-pink-500'   },
];

export default function TransaksiPage() {
  const qc = useQueryClient();
  const [quickTab, setQuickTab] = useState<QuickTab>('semua');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Transaksi | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterBulan, setFilterBulan] = useState(String(now.getMonth() + 1));
  const [filterTahun, setFilterTahun] = useState(String(now.getFullYear()));
  const [filterUnit, setFilterUnit] = useState('');
  const [page, setPage] = useState(1);
  const [siswaSearch, setSiswaSearch] = useState('');
  const [showSiswaDropdown, setShowSiswaDropdown] = useState(false);

  // derived filter params from quick tab
  const tabFilter = useMemo(() => {
    if (quickTab === 'pemasukan')  return { tipe: 'pemasukan',   kategori: undefined };
    if (quickTab === 'pengeluaran')return { tipe: 'pengeluaran',  kategori: undefined };
    if (quickTab === 'tabungan')   return { tipe: undefined,      kategori: 'Tabungan' };
    if (quickTab === 'infak')      return { tipe: 'pemasukan',    kategori: 'Infak Qurban' };
    return { tipe: undefined, kategori: undefined };
  }, [quickTab]);

  const { data: rekapData } = useQuery({
    queryKey: ['transaksi-rekap', filterBulan, filterTahun, filterUnit],
    queryFn: () => api.get('/keuangan/transaksi/rekap', {
      params: { bulan: filterBulan, tahun: filterTahun, unit: filterUnit || undefined },
    }).then(r => r.data?.data),
    staleTime: 60_000,
  });

  const showSiswaField = form.tipe === 'pemasukan' && KATEGORI_SISWA.includes(form.kategori);

  const { data: siswaData } = useQuery({
    queryKey: ['siswa-list-keuangan'],
    queryFn: () => api.get('/siswa', { params: { limit: 500 } }).then(r => r.data?.data || []),
    staleTime: 5 * 60_000,
    enabled: showForm,
  });

  const siswaList: any[] = siswaData || [];
  const siswaSuggestions = useMemo(() => {
    if (!siswaSearch || siswaSearch.length < 2) return [];
    const q = siswaSearch.toLowerCase();
    return siswaList.filter((s: any) =>
      (s.user?.nama || '').toLowerCase().includes(q) ||
      (s.nis || '').includes(q) ||
      (s.kelas?.nama || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [siswaSearch, siswaList]);

  const { data: listData, isLoading } = useQuery({
    queryKey: ['transaksi-list', tabFilter, filterBulan, filterTahun, filterUnit, page],
    queryFn: () => api.get('/keuangan/transaksi', {
      params: {
        tipe: tabFilter.tipe,
        kategori: tabFilter.kategori,
        unit: filterUnit || undefined,
        bulan: filterBulan,
        tahun: filterTahun,
        page,
        limit: 20,
      },
    }).then(r => r.data),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      editItem
        ? api.put(`/keuangan/transaksi/${editItem.id}`, data)
        : api.post('/keuangan/transaksi', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transaksi-list'] });
      qc.invalidateQueries({ queryKey: ['transaksi-rekap'] });
      setShowForm(false); setEditItem(null); setForm({ ...EMPTY_FORM });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/keuangan/transaksi/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transaksi-list'] });
      qc.invalidateQueries({ queryKey: ['transaksi-rekap'] });
    },
  });

  const openEdit = (t: Transaksi) => {
    setEditItem(t);
    setSiswaSearch(t.nama_pihak || '');
    setShowSiswaDropdown(false);
    setForm({
      tanggal: t.tanggal, tipe: t.tipe, kategori: t.kategori,
      sub_kategori: t.sub_kategori || '', unit: t.unit, jumlah: String(t.jumlah),
      keterangan: t.keterangan || '', metode: t.metode, nama_pihak: t.nama_pihak || '',
    });
    setShowForm(true);
  };

  const openNew = (presetTipe?: 'pemasukan' | 'pengeluaran', presetKategori?: string) => {
    setEditItem(null);
    setForm({
      ...EMPTY_FORM,
      tipe: presetTipe || EMPTY_FORM.tipe,
      kategori: presetKategori || '',
    });
    setSiswaSearch('');
    setShowSiswaDropdown(false);
    setShowForm(true);
  };

  const submit = () => {
    if (!form.tanggal || !form.kategori || !form.jumlah) return;
    saveMutation.mutate(form);
  };

  const handlePrint = async () => {
    const res = await api.get('/keuangan/transaksi', {
      params: {
        tipe: tabFilter.tipe, kategori: tabFilter.kategori,
        unit: filterUnit || undefined, bulan: filterBulan, tahun: filterTahun, limit: 500,
      },
    });
    const rows: Transaksi[] = res.data?.data || [];
    const lap = rekapData?.summary || {};
    const bulanLabel = bulanNames[parseInt(filterBulan) - 1];
    const unitLabel = filterUnit || 'Semua Unit';
    const tabLabel = QUICK_TABS.find(t => t.id === quickTab)?.label || 'Semua';
    const tgl = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
<title>Laporan Transaksi ${tabLabel} - Al-Fakhir School</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:24px}
  .hdr{text-align:center;margin-bottom:20px;border-bottom:2px solid #1A2332;padding-bottom:14px}
  .hdr h1{font-size:18px;font-weight:700;color:#1A2332}
  .hdr h2{font-size:14px;font-weight:600;color:#d97706;margin-top:4px}
  .hdr p{font-size:11px;color:#666;margin-top:4px}
  .cards{display:flex;gap:12px;margin-bottom:18px}
  .card{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px}
  .card .lbl{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px}
  .card .val{font-size:14px;font-weight:700;margin-top:2px}
  .card.g .val{color:#059669}.card.r .val{color:#dc2626}.card.b .val{color:#2563eb}
  table{width:100%;border-collapse:collapse}
  th{background:#1A2332;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:7px 10px;text-align:left}
  td{padding:7px 10px;border-bottom:1px solid #f0f0f0;font-size:11px}
  tr:nth-child(even) td{background:#f9fafb}
  .in{color:#059669;font-weight:700}.out{color:#dc2626;font-weight:700}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:600}
  .ftr{margin-top:24px;font-size:10px;color:#666;text-align:right}
  @media print{body{padding:0}}
</style></head><body>
<div class="hdr">
  <h1>Al-Fakhir School</h1>
  <h2>Laporan Transaksi — ${tabLabel}</h2>
  <p>Periode: ${bulanLabel} ${filterTahun} · Unit: ${unitLabel} · Dicetak: ${tgl} · Total: ${rows.length} transaksi</p>
</div>
<div class="cards">
  <div class="card g"><div class="lbl">Pemasukan</div><div class="val">${fmt(lap.total_pemasukan ?? 0)}</div></div>
  <div class="card r"><div class="lbl">Pengeluaran</div><div class="val">${fmt(lap.total_pengeluaran ?? 0)}</div></div>
  <div class="card b"><div class="lbl">Saldo</div><div class="val">${fmt(lap.saldo ?? 0)}</div></div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Unit</th>
    <th>Metode</th><th class="num">Jumlah</th><th>Keterangan</th>
  </tr></thead>
  <tbody>
    ${rows.map((t, i) => `<tr>
      <td>${i + 1}</td>
      <td>${t.tanggal}</td>
      <td class="${t.tipe === 'pemasukan' ? 'in' : 'out'}">${t.tipe === 'pemasukan' ? '▲ Masuk' : '▼ Keluar'}</td>
      <td>${t.kategori}${t.sub_kategori ? ' · ' + t.sub_kategori : ''}</td>
      <td>${t.unit}</td>
      <td>${t.metode}</td>
      <td class="num ${t.tipe === 'pemasukan' ? 'in' : 'out'}">${t.tipe === 'pengeluaran' ? '−' : '+'}${fmt(t.jumlah)}</td>
      <td>${t.keterangan || t.nama_pihak || '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="ftr">Al-Fakhir School Management System · ${tgl}</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const list: Transaksi[] = listData?.data || [];
  const pagination = listData?.pagination;
  const summary = rekapData?.summary;
  const perKategori: any[] = rekapData?.per_kategori || [];

  // breakdown pengeluaran per unit dari per_kategori
  const totalHarian = perKategori.filter(k => k.tipe === 'pengeluaran' && k.kategori === 'Pengeluaran Harian').reduce((s: number, k: any) => s + parseInt(k.total), 0);
  const totalSD     = perKategori.filter(k => k.tipe === 'pengeluaran' && k.kategori === 'Pengeluaran SD').reduce((s: number, k: any) => s + parseInt(k.total), 0);
  const totalSMP    = perKategori.filter(k => k.tipe === 'pengeluaran' && k.kategori === 'Pengeluaran SMP').reduce((s: number, k: any) => s + parseInt(k.total), 0);
  const totalTabunganMasuk = perKategori.filter(k => k.tipe === 'pemasukan' && k.kategori === 'Tabungan').reduce((s: number, k: any) => s + parseInt(k.total), 0);
  const totalTabunganKeluar = perKategori.filter(k => k.tipe === 'pengeluaran' && k.kategori === 'Tabungan').reduce((s: number, k: any) => s + parseInt(k.total), 0);
  const totalInfak  = perKategori.filter(k => k.kategori === 'Infak Qurban').reduce((s: number, k: any) => s + parseInt(k.total), 0);

  const kategoriList = form.tipe === 'pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Transaksi Keuangan" />
      <div className="p-6 max-w-6xl mx-auto space-y-5">

        {/* ── Period filter ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar size={15} className="text-gray-400" />
            <select value={filterBulan} onChange={e => { setFilterBulan(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
              {bulanNames.map((b, i) => <option key={i} value={String(i + 1)}>{b}</option>)}
            </select>
            <select value={filterTahun} onChange={e => { setFilterTahun(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterUnit} onChange={e => { setFilterUnit(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">Semua Unit</option>
              {UNIT_LIST.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <div className="ml-auto flex gap-2">
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors">
                <Download size={14} /> PDF
              </button>
              <button onClick={() => openNew()}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors">
                <Plus size={15} /> Tambah
              </button>
            </div>
          </div>
        </div>

        {/* ── Summary cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center"><TrendingUp size={16} className="text-green-600" /></div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Pemasukan</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{fmtShort(summary?.total_pemasukan || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{summary?.count_pemasukan || 0} transaksi</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"><TrendingDown size={16} className="text-red-500" /></div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Pengeluaran</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{fmtShort(summary?.total_pengeluaran || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{summary?.count_pengeluaran || 0} transaksi</p>
          </div>
          <div className={`rounded-2xl p-4 border shadow-sm ${(summary?.saldo || 0) >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center"><Wallet size={16} className="text-amber-600" /></div>
              <span className="text-xs font-semibold text-amber-700 uppercase">Saldo</span>
            </div>
            <p className={`text-lg font-bold ${(summary?.saldo || 0) >= 0 ? 'text-amber-800' : 'text-red-700'}`}>{fmtShort(summary?.saldo || 0)}</p>
            <p className="text-xs text-amber-600 mt-0.5">Pemasukan − Pengeluaran</p>
          </div>
          <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center"><PiggyBank size={16} className="text-sky-600" /></div>
              <span className="text-xs font-semibold text-sky-700 uppercase">Tabungan</span>
            </div>
            <p className="text-lg font-bold text-sky-800">{fmtShort(totalTabunganMasuk)}</p>
            <p className="text-xs text-sky-500 mt-0.5">Ditarik: {fmtShort(totalTabunganKeluar)}</p>
          </div>
        </div>

        {/* ── Breakdown pengeluaran + infak ─────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pengeluaran Harian', val: totalHarian, icon: Receipt,   color: 'text-orange-600 bg-orange-50',  border: 'border-orange-100', preset: { t: 'pengeluaran' as const, k: 'Pengeluaran Harian' } },
            { label: 'Pengeluaran SD',     val: totalSD,     icon: School,    color: 'text-sky-600 bg-sky-50',        border: 'border-sky-100',    preset: { t: 'pengeluaran' as const, k: 'Pengeluaran SD' } },
            { label: 'Pengeluaran SMP',    val: totalSMP,    icon: Building2, color: 'text-violet-600 bg-violet-50',  border: 'border-violet-100', preset: { t: 'pengeluaran' as const, k: 'Pengeluaran SMP' } },
            { label: 'Infak Qurban',       val: totalInfak,  icon: Heart,     color: 'text-pink-600 bg-pink-50',      border: 'border-pink-100',   preset: { t: 'pemasukan' as const, k: 'Infak Qurban' } },
          ].map(({ label, val, icon: Icon, color, border, preset }) => (
            <button key={label} onClick={() => openNew(preset.t, preset.k)}
              className={`bg-white rounded-2xl p-4 border ${border} shadow-sm text-left hover:shadow-md transition-shadow group`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}><Icon size={15} /></div>
                <span className="text-xs font-semibold text-gray-500 uppercase leading-tight">{label}</span>
              </div>
              <p className="text-base font-bold text-gray-900">{fmtShort(val)}</p>
              <p className="text-xs text-gray-400 mt-0.5 group-hover:text-blue-400 transition-colors">+ Tambah →</p>
            </button>
          ))}
        </div>

        {/* ── Quick tab navigation ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {QUICK_TABS.map(tab => {
              const Icon = tab.icon;
              const active = quickTab === tab.id;
              return (
                <button key={tab.id} onClick={() => { setQuickTab(tab.id); setPage(1); }}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? `border-amber-500 ${tab.color} bg-amber-50/40`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Belum ada transaksi di periode ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Tipe</th>
                    <th className="px-4 py-3 text-left">Kategori</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-left">Metode</th>
                    <th className="px-4 py-3 text-right">Jumlah</th>
                    <th className="px-4 py-3 text-left">Keterangan</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{t.tanggal}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.tipe === 'pemasukan' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {t.tipe === 'pemasukan' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {t.kategori}{t.sub_kategori ? ` · ${t.sub_kategori}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          t.unit === 'SD' ? 'bg-sky-100 text-sky-700' :
                          t.unit === 'SMP' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                        }`}>{t.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{t.metode}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${t.tipe === 'pemasukan' ? 'text-green-700' : 'text-red-600'}`}>
                        {t.tipe === 'pengeluaran' ? '−' : '+'}{fmt(t.jumlah)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate">{t.keterangan || t.nama_pihak || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { if (confirm('Hapus transaksi ini?')) deleteMutation.mutate(t.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {pagination.total} transaksi · halaman {page} dari {pagination.totalPages}
              </p>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={15} />
                </button>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editItem ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipe */}
              <div className="flex gap-2">
                {(['pemasukan', 'pengeluaran'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipe: t, kategori: '' }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      form.tipe === t
                        ? t === 'pemasukan' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {t === 'pemasukan' ? '▲ Pemasukan' : '▼ Pengeluaran'}
                  </button>
                ))}
              </div>

              {/* Tanggal */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Tanggal</label>
                <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              {/* Kategori */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Kategori</label>
                <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value, sub_kategori: '' }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">Pilih kategori...</option>
                  {kategoriList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {/* Siswa selector */}
              {showSiswaField && (
                <div className="relative">
                  <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1"><User size={11} /> Nama Siswa</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={siswaSearch || form.nama_pihak}
                      onChange={e => { setSiswaSearch(e.target.value); setForm(f => ({ ...f, nama_pihak: e.target.value })); setShowSiswaDropdown(true); }}
                      onFocus={() => setShowSiswaDropdown(true)}
                      placeholder="Cari nama / NIS / kelas..."
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  {showSiswaDropdown && siswaSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {siswaSuggestions.map((s: any) => (
                        <button key={s.id} type="button"
                          onClick={() => {
                            const nama = s.user?.nama || '';
                            setSiswaSearch(nama);
                            setForm(f => ({ ...f, nama_pihak: nama, unit: s.kelas?.sekolah?.level || f.unit }));
                            setShowSiswaDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-amber-50 transition-colors border-b border-gray-50 last:border-0">
                          <p className="text-sm font-medium text-gray-800">{s.user?.nama}</p>
                          <p className="text-xs text-gray-400">{s.nis} · {s.kelas?.nama}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub kategori ekskul */}
              {form.kategori === 'Ekskul' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Jenis Ekskul</label>
                  <select value={form.sub_kategori} onChange={e => setForm(f => ({ ...f, sub_kategori: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Pilih jenis ekskul...</option>
                    {SUB_EKSKUL.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Unit + Metode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {UNIT_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Metode</label>
                  <select value={form.metode} onChange={e => setForm(f => ({ ...f, metode: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {METODE_LIST.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Jumlah */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Jumlah (Rp)</label>
                <input type="number" min="1" value={form.jumlah}
                  onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Nama pihak */}
              {!showSiswaField && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Nama Pembayar / Penerima (opsional)</label>
                  <input type="text" value={form.nama_pihak}
                    onChange={e => setForm(f => ({ ...f, nama_pihak: e.target.value }))}
                    placeholder="Nama siswa, vendor, dll."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}

              {/* Keterangan */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Keterangan (opsional)</label>
                <textarea rows={2} value={form.keterangan}
                  onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Catatan tambahan..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => { setShowForm(false); setEditItem(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button onClick={submit}
                disabled={saveMutation.isPending || !form.tanggal || !form.kategori || !form.jumlah}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {saveMutation.isPending ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
