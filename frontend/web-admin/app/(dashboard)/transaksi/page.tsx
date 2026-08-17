'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, TrendingUp, TrendingDown, Wallet, Filter, X, Pencil, Trash2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const KATEGORI_PEMASUKAN = ['SPP', 'Ekskul', 'UKT', 'Uang Masuk', 'Formulir Pendaftaran', 'Lainnya'];
const KATEGORI_PENGELUARAN = ['Pengeluaran Harian', 'Pembayaran Kas & Transfer', 'Pengeluaran SD', 'Pengeluaran SMP', 'Lainnya'];
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
  id: string;
  tanggal: string;
  tipe: 'pemasukan' | 'pengeluaran';
  kategori: string;
  sub_kategori: string | null;
  unit: string;
  jumlah: number;
  keterangan: string | null;
  metode: string;
  nama_pihak: string | null;
  created_at: string;
};

export default function TransaksiPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Transaksi | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filter, setFilter] = useState({ tipe: '', unit: '', bulan: String(now.getMonth() + 1), tahun: String(now.getFullYear()) });
  const [page, setPage] = useState(1);

  const { data: rekapData } = useQuery({
    queryKey: ['transaksi-rekap', filter.bulan, filter.tahun, filter.unit],
    queryFn: () => api.get('/keuangan/transaksi/rekap', { params: { bulan: filter.bulan, tahun: filter.tahun, unit: filter.unit || undefined } }).then(r => r.data?.data),
    staleTime: 60_000,
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ['transaksi-list', filter, page],
    queryFn: () => api.get('/keuangan/transaksi', {
      params: { tipe: filter.tipe || undefined, unit: filter.unit || undefined, bulan: filter.bulan, tahun: filter.tahun, page, limit: 20 },
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
      setShowForm(false);
      setEditItem(null);
      setForm({ ...EMPTY_FORM });
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
    setForm({
      tanggal: t.tanggal,
      tipe: t.tipe,
      kategori: t.kategori,
      sub_kategori: t.sub_kategori || '',
      unit: t.unit,
      jumlah: String(t.jumlah),
      keterangan: t.keterangan || '',
      metode: t.metode,
      nama_pihak: t.nama_pihak || '',
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const submit = () => {
    if (!form.tanggal || !form.kategori || !form.jumlah) return;
    saveMutation.mutate(form);
  };

  const list: Transaksi[] = listData?.data || [];
  const pagination = listData?.pagination;
  const summary = rekapData?.summary;

  const kategoriList = form.tipe === 'pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;

  const bulanNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Transaksi Keuangan" />
      <div className="p-6 max-w-6xl mx-auto space-y-5">

        {/* Rekap cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pemasukan</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{fmt(summary?.total_pemasukan || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{summary?.count_pemasukan || 0} transaksi</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown size={18} className="text-red-500" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pengeluaran</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{fmt(summary?.total_pengeluaran || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{summary?.count_pengeluaran || 0} transaksi</p>
          </div>
          <div className={`rounded-2xl p-5 border shadow-sm ${(summary?.saldo || 0) >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                <Wallet size={18} className="text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Saldo</span>
            </div>
            <p className={`text-xl font-bold ${(summary?.saldo || 0) >= 0 ? 'text-amber-800' : 'text-red-700'}`}>{fmt(summary?.saldo || 0)}</p>
            <p className="text-xs text-amber-600 mt-0.5">Pemasukan − Pengeluaran</p>
          </div>
        </div>

        {/* Filter + Add */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter size={15} className="text-gray-400 flex-shrink-0" />

            <select
              value={filter.bulan}
              onChange={e => { setFilter(f => ({ ...f, bulan: e.target.value })); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {bulanNames.map((b, i) => <option key={i} value={String(i + 1)}>{b}</option>)}
            </select>

            <select
              value={filter.tahun}
              onChange={e => { setFilter(f => ({ ...f, tahun: e.target.value })); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              value={filter.tipe}
              onChange={e => { setFilter(f => ({ ...f, tipe: e.target.value })); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Semua Tipe</option>
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>

            <select
              value={filter.unit}
              onChange={e => { setFilter(f => ({ ...f, unit: e.target.value })); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Semua Unit</option>
              {UNIT_LIST.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <button
              onClick={openNew}
              className="ml-auto flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors"
            >
              <Plus size={15} /> Tambah Transaksi
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Belum ada transaksi di periode ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
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
                          t.unit === 'SD' ? 'bg-orange-100 text-orange-700' :
                          t.unit === 'SMP' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
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
                          <button
                            onClick={() => { if (confirm('Hapus transaksi ini?')) deleteMutation.mutate(t.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                          >
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

          {/* Pagination */}
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

      {/* Modal Form */}
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
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, tipe: t, kategori: '' }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      form.tipe === t
                        ? t === 'pemasukan' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
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
                <input
                  type="number" min="1" value={form.jumlah}
                  onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Nama pihak */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nama Pembayar / Penerima (opsional)</label>
                <input type="text" value={form.nama_pihak}
                  onChange={e => setForm(f => ({ ...f, nama_pihak: e.target.value }))}
                  placeholder="Nama siswa, vendor, dll."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

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
              <button
                onClick={submit}
                disabled={saveMutation.isPending || !form.tanggal || !form.kategori || !form.jumlah}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {saveMutation.isPending ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
