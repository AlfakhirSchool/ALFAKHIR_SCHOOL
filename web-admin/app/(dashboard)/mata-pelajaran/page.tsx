'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function MataPelajaranPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: '', kode: '', kkm: '75' });
  const [editId, setEditId] = useState<string | null>(null);

  const { data: mapelList, isLoading } = useQuery({
    queryKey: ['mata-pelajaran'],
    queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data || []),
  });

  const save = useMutation({
    mutationFn: () => editId
      ? api.put(`/mata-pelajaran/${editId}`, { ...form, kkm: parseInt(form.kkm) })
      : api.post('/mata-pelajaran', { ...form, kkm: parseInt(form.kkm) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mata-pelajaran'] });
      setShowForm(false);
      setForm({ nama: '', kode: '', kkm: '75' });
      setEditId(null);
    },
  });

  const openEdit = (m: any) => {
    setForm({ nama: m.nama, kode: m.kode || '', kkm: m.kkm?.toString() || '75' });
    setEditId(m.id);
    setShowForm(true);
  };

  return (
    <div>
      <Header title="Mata Pelajaran" />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ nama: '', kode: '', kkm: '75' }); }}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] font-medium text-sm">
            + Tambah Mata Pelajaran
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#3B7FD1]/20">
            <h3 className="font-semibold text-[#1A2332] mb-4">{editId ? 'Edit' : 'Tambah'} Mata Pelajaran</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Mata Pelajaran *</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Matematika" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kode</label>
                <input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  placeholder="MTK" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">KKM (0-100)</label>
                <input type="number" min="0" max="100" value={form.kkm} onChange={(e) => setForm({ ...form, kkm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => save.mutate()} disabled={!form.nama || save.isPending}
                className="px-5 py-2 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {save.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Nama</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kode</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">KKM</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">Memuat...</td></tr>
              ) : (mapelList || []).length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">Belum ada mata pelajaran</td></tr>
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
                    <button onClick={() => openEdit(m)} className="text-[#3B7FD1] hover:underline text-xs mr-2">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
