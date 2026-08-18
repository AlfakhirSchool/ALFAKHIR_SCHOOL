'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const JENJANG_LIST = ['SD', 'SMP'] as const;
const JENJANG_COLOR: Record<string, { active: string; passive: string; badge: string }> = {
  SD:  { active: 'bg-orange-500 text-white', passive: 'bg-orange-50 text-orange-700 hover:bg-orange-100', badge: 'bg-orange-100 text-orange-700' },
  SMP: { active: 'bg-[#1B8B87] text-white',  passive: 'bg-teal-50 text-teal-700 hover:bg-teal-100',      badge: 'bg-teal-100 text-teal-700' },
  SMA: { active: 'bg-blue-600 text-white',    passive: 'bg-blue-50 text-blue-700 hover:bg-blue-100',      badge: 'bg-blue-100 text-blue-700' },
};

export default function MataPelajaranPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const adminLevel = (user as any)?.school_level as string | null;
  const allowedJenjang = adminLevel ? [adminLevel] : JENJANG_LIST;
  const [activeJenjang, setActiveJenjang] = useState<string>(adminLevel || 'SD');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: '', kode: '', kkm: '75', jenjang: 'SD', jam_pelajaran: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [hapusNama, setHapusNama] = useState<string>('');

  const { data: mapelList, isLoading } = useQuery({
    queryKey: ['mata-pelajaran', activeJenjang],
    queryFn: () => api.get('/mata-pelajaran', { params: { jenjang: activeJenjang } }).then(r => r.data.data || []),
  });

  const [saveError, setSaveError] = useState<string>('');

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, kkm: parseInt(form.kkm), jam_pelajaran: form.jam_pelajaran ? parseInt(form.jam_pelajaran) : null };
      return editId
        ? api.put(`/mata-pelajaran/${editId}`, payload)
        : api.post('/mata-pelajaran', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mata-pelajaran'] });
      setShowForm(false);
      setSaveError('');
      setForm({ nama: '', kode: '', kkm: '75', jenjang: activeJenjang, jam_pelajaran: '' });
      setEditId(null);
    },
    onError: (e: any) => setSaveError(e?.response?.data?.message || e?.message || 'Gagal menyimpan'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/mata-pelajaran/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mata-pelajaran'] }); setHapusId(null); },
  });

  const openEdit = (m: any) => {
    setForm({ nama: m.nama, kode: m.kode || '', kkm: m.kkm?.toString() || '75', jenjang: m.jenjang || activeJenjang, jam_pelajaran: m.jam_pelajaran?.toString() || '' });
    setEditId(m.id);
    setShowForm(true);
  };

  const openAdd = () => {
    setForm({ nama: '', kode: '', kkm: '75', jenjang: activeJenjang, jam_pelajaran: '' });
    setEditId(null);
    setShowForm(true);
  };

  const jc = JENJANG_COLOR[activeJenjang];

  return (
    <div>
      <Header title="Mata Pelajaran" />
      <div className="p-6">

        {/* Jenjang tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {allowedJenjang.map(j => {
            const c = JENJANG_COLOR[j];
            return (
              <button key={j} onClick={() => { setActiveJenjang(j); setShowForm(false); }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeJenjang === j ? c.active : c.passive}`}>
                {j}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={openAdd}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] font-medium text-sm">
            + Tambah Mata Pelajaran {activeJenjang}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#3B7FD1]/20">
            <h3 className="font-semibold text-[#1A2332] mb-4">{editId ? 'Edit' : 'Tambah'} Mata Pelajaran</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Mata Pelajaran *</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Matematika" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
                <p className="text-xs text-gray-400 mt-0.5">Huruf kapital awal kata — cth: Matematika</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kode</label>
                <input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                  placeholder="MTK" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1] uppercase" />
                <p className="text-xs text-blue-500 mt-0.5">Otomatis HURUF BESAR — cth: MTK, IPA</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">KKM (0-100)</label>
                <input type="number" min="0" max="100" value={form.kkm} onChange={(e) => setForm({ ...form, kkm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">JP (Jam/Minggu)</label>
                <input type="number" min="0" max="40" value={form.jam_pelajaran} onChange={(e) => setForm({ ...form, jam_pelajaran: e.target.value })}
                  placeholder="2" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang *</label>
                <select value={form.jenjang} onChange={e => setForm({ ...form, jenjang: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]">
                  {allowedJenjang.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            </div>
            {saveError && <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => save.mutate()} disabled={!form.nama || save.isPending}
                className="px-5 py-2 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {save.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); setSaveError(''); }} className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Nama</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kode</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">KKM</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">JP</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Jenjang</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Memuat...</td></tr>
              ) : (mapelList || []).length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Belum ada mata pelajaran untuk jenjang {activeJenjang}</td></tr>
              ) : (mapelList || []).map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-800">{m.nama}</td>
                  <td className="px-6 py-4">
                    {m.kode && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono font-medium">{m.kode}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-700">{m.kkm}</span>
                    <span className="text-gray-400 text-xs ml-1">(min lulus)</span>
                  </td>
                  <td className="px-6 py-4">
                    {m.jam_pelajaran ? (
                      <span className="font-medium text-gray-700">{m.jam_pelajaran}<span className="text-gray-400 text-xs ml-1">jp</span></span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {m.jenjang && (
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${JENJANG_COLOR[m.jenjang]?.badge || 'bg-gray-100 text-gray-600'}`}>
                        {m.jenjang}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(m)} className="text-[#3B7FD1] hover:underline text-xs">Edit</button>
                      <button onClick={() => { setHapusId(m.id); setHapusNama(m.nama); }}
                        className="text-red-500 hover:underline text-xs">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {hapusId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Hapus Mata Pelajaran?</h3>
              <p className="text-sm text-gray-500 mt-1 font-semibold">{hapusNama}</p>
              <p className="text-xs text-red-500 mt-2">Semua data nilai yang terkait juga akan terpengaruh.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setHapusId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Batal
              </button>
              <button onClick={() => deleteMut.mutate(hapusId!)} disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
