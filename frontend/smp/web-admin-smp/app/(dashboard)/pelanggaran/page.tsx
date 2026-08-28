'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Search, Trash2, Plus, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const JENIS_PELANGGARAN = [
  'Terlambat masuk kelas', 'Tidak mengerjakan tugas', 'Gadget tanpa izin',
  'Berpakaian tidak rapi', 'Berkelahi', 'Tidak sopan kepada guru',
  'Bolos pelajaran', 'Merusak fasilitas sekolah', 'Lainnya',
];

export default function PelanggaranAdminPage() {
  const qc = useQueryClient();
  const [kelasId, setKelasId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formKelasId, setFormKelasId] = useState('');
  const [form, setForm] = useState({
    siswa_id: '', jenis_pelanggaran: '', poin: '5', keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-admin'],
    queryFn: () => api.get('/kelas').then((r: any) => r.data.data || []),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-kelas-form', formKelasId],
    queryFn: () => api.get(`/kelas/${formKelasId}/siswa`).then((r: any) => r.data.data || []),
    enabled: !!formKelasId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['pelanggaran-admin', kelasId],
    queryFn: () => api.get('/pelanggaran', { params: kelasId ? { kelas_id: kelasId } : {} }).then((r: any) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/pelanggaran', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pelanggaran-admin'] });
      setShowForm(false);
      setForm({ siswa_id: '', jenis_pelanggaran: '', poin: '5', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/pelanggaran/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pelanggaran-admin'] }),
  });

  const list: any[] = data?.data || [];

  // Rekap poin per siswa
  const rekap = list.reduce((acc: Record<string, { nama: string; kelas: string; total: number }>, p: any) => {
    const sid = p.siswa_id;
    if (!acc[sid]) acc[sid] = { nama: p.siswa?.user?.nama || '—', kelas: p.siswa?.kelas?.nama || '—', total: 0 };
    acc[sid].total += p.poin;
    return acc;
  }, {});
  const rekapList = Object.values(rekap).sort((a: any, b: any) => b.total - a.total);

  return (
    <div>
      <Header title="Rekap Pelanggaran" />
      <div className="p-6 max-w-5xl space-y-6">

        {/* Filter */}
        <div className="flex flex-wrap gap-3 items-center">
          <select value={kelasId} onChange={e => setKelasId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
            <option value="">Semua Kelas</option>
            {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <button onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-[#1B8B87] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#166f6c]">
            <Plus size={16} /> Catat Pelanggaran
          </button>
        </div>

        {/* Rekap per siswa */}
        {rekapList.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-[#1A2332] mb-3 text-sm">Akumulasi Poin</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {rekapList.slice(0, 9).map((r: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${r.total >= 20 ? 'bg-red-50' : r.total >= 10 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${r.total >= 20 ? 'bg-red-100 text-red-700' : r.total >= 10 ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>
                    {r.total}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A2332]">{r.nama}</p>
                    <p className="text-xs text-gray-400">{r.kelas}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-[#1A2332]">Catat Pelanggaran</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Kelas</label>
                  <select value={formKelasId} onChange={e => { setFormKelasId(e.target.value); setForm(f => ({ ...f, siswa_id: '' })); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Pilih Kelas --</option>
                    {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Siswa</label>
                  <select value={form.siswa_id} onChange={e => setForm(f => ({ ...f, siswa_id: e.target.value }))}
                    disabled={!formKelasId}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] disabled:opacity-50">
                    <option value="">-- Pilih Siswa --</option>
                    {(siswaList as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.user?.nama || s.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Jenis Pelanggaran</label>
                  <select value={form.jenis_pelanggaran} onChange={e => setForm(f => ({ ...f, jenis_pelanggaran: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Pilih Jenis --</option>
                    {JENIS_PELANGGARAN.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Total Poin</label>
                    <input type="number" min="1" max="100" value={form.poin} onChange={e => setForm(f => ({ ...f, poin: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Tanggal</label>
                    <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Keterangan</label>
                  <textarea value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} rows={2}
                    placeholder="Opsional"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
                <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.siswa_id || !form.jenis_pelanggaran}
                  className="flex-1 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#166f6c] disabled:opacity-50">
                  {createMut.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
        {!isLoading && list.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <AlertTriangle size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Belum ada catatan pelanggaran.</p>
          </div>
        )}
        <div className="space-y-2">
          {list.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-bold text-sm">{p.poin}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1A2332] text-sm">{p.siswa?.user?.nama || '—'}</p>
                <p className="text-xs text-gray-500">{p.jenis_pelanggaran}</p>
                {p.keterangan && <p className="text-xs text-gray-400 mt-0.5">{p.keterangan}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">{p.siswa?.kelas?.nama}</p>
                <p className="text-xs text-gray-400">{p.guru?.user?.nama ? `oleh ${p.guru.user.nama}` : ''}</p>
                <p className="text-xs text-gray-400">{p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}</p>
              </div>
              <button onClick={() => { if (confirm('Hapus catatan ini?')) deleteMut.mutate(p.id); }}
                className="text-gray-300 hover:text-red-400 flex-shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
