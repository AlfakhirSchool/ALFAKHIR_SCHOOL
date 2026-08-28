'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, AlertTriangle } from 'lucide-react';
import Header from '@/components/layout/Header';
import { api } from '@/lib/api';

const JENIS_PELANGGARAN = [
  'Terlambat masuk kelas', 'Tidak mengerjakan tugas', 'Gadget tanpa izin',
  'Berpakaian tidak rapi', 'Berkelahi', 'Tidak sopan kepada guru',
  'Bolos pelajaran', 'Merusak fasilitas sekolah', 'Lainnya',
];

export default function PelanggaranGuruPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [kelasId, setKelasId] = useState('');
  const [siswaId, setSiswaId] = useState('');
  const [form, setForm] = useState({
    siswa_id: '', jenis_pelanggaran: '', poin: '5', keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const { data: profile } = useQuery({
    queryKey: ['guru-profile'], staleTime: 5 * 60 * 1000,
    queryFn: () => api.get('/auth/me').then((r: any) => r.data.data),
  });
  const guruKelas: any[] = profile?.guru?.kelas_list || [];

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-guru-piket'],
    queryFn: async () => {
      const jadwal = await api.get('/jadwal-pelajaran').then((r: any) => r.data.data ?? []).catch(() => []);
      const seen = new Set<string>();
      return jadwal.map((j: any) => j.kelas).filter((k: any) => k && !seen.has(k.id) && seen.add(k.id));
    },
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-kelas', kelasId],
    queryFn: () => api.get(`/kelas/${kelasId}/siswa`).then((r: any) => r.data.data || []),
    enabled: !!kelasId,
  });

  const { data: pelanggaranData, isLoading } = useQuery({
    queryKey: ['pelanggaran-guru', kelasId],
    queryFn: () => api.get('/pelanggaran', { params: kelasId ? { kelas_id: kelasId } : {} }).then((r: any) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/pelanggaran', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pelanggaran-guru'] }); setShowForm(false); setForm({ siswa_id: '', jenis_pelanggaran: '', poin: '5', keterangan: '', tanggal: new Date().toISOString().split('T')[0] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/pelanggaran/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pelanggaran-guru'] }),
  });

  const list: any[] = pelanggaranData?.data || [];

  const submit = () => {
    if (!form.siswa_id || !form.jenis_pelanggaran || !form.tanggal) return;
    createMut.mutate(form);
  };

  return (
    <div>
      <Header title="Catatan Pelanggaran" />
      <div className="p-6 max-w-4xl">

        {/* Filter + Tombol */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <select value={kelasId} onChange={e => { setKelasId(e.target.value); setSiswaId(''); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
            <option value="">Semua Kelas</option>
            {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <button onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-[#1B8B87] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#166f6c]">
            <Plus size={16} /> Catat Pelanggaran
          </button>
        </div>

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
                  <select value={kelasId} onChange={e => setKelasId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Pilih Kelas --</option>
                    {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Siswa</label>
                  <select value={form.siswa_id} onChange={e => setForm(f => ({ ...f, siswa_id: e.target.value }))}
                    disabled={!kelasId}
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
                    placeholder="Opsional — tambahkan detail jika perlu"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
                <button onClick={submit} disabled={createMut.isPending || !form.siswa_id || !form.jenis_pelanggaran}
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
