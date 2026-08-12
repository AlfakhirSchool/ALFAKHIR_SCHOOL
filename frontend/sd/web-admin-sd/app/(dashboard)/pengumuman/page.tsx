'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Megaphone } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const KATEGORI = ['Pengumuman', 'Kegiatan', 'Info Sekolah', 'Akademik', 'Keuangan'];

const emptyForm = { judul: '', isi: '', kategori: 'Pengumuman', school_level: 'SD', target_role: 'all', tanggal_publish: '' };

export default function PengumumanPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pengumuman'],
    queryFn: () => api.get('/pengumuman').then(r => r.data.data as any[]),
  });

  const saveMut = useMutation({
    mutationFn: (d: any) => editId
      ? api.put(`/pengumuman/${editId}`, d)
      : api.post('/pengumuman', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-pengumuman'] }); closeForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/pengumuman/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-pengumuman'] }); setDeleteId(null); },
  });

  const openAdd = () => { setForm({ ...emptyForm }); setEditId(null); setShowForm(true); };
  const openEdit = (p: any) => {
    setForm({
      judul: p.judul, isi: p.isi, kategori: p.kategori,
      school_level: p.school_level, target_role: p.target_role,
      tanggal_publish: p.tanggal_publish?.slice(0, 10) || '',
    });
    setEditId(p.id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate(form);
  };

  const list: any[] = data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Pengumuman" />
      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Kelola Pengumuman</h1>
            <p className="text-sm text-gray-500">{list.length} pengumuman aktif</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
            <Plus size={16} /> Tambah
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
            <Megaphone size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-semibold">Belum ada pengumuman</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Megaphone size={18} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{p.kategori}</span>
                    <span className="text-xs text-gray-400">{new Date(p.tanggal_publish).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <p className="font-bold text-gray-800 text-sm">{p.judul}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.isi}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(p)}
                    className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                    <Pencil size={14} className="text-blue-600" />
                  </button>
                  <button onClick={() => setDeleteId(p.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">{editId ? 'Edit' : 'Tambah'} Pengumuman</h2>
              <button onClick={closeForm} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Judul</label>
                <input value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Isi / Deskripsi</label>
                <textarea value={form.isi} onChange={e => setForm(f => ({ ...f, isi: e.target.value }))} required rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Kategori</label>
                  <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
                    {KATEGORI.map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal</label>
                  <input type="date" value={form.tanggal_publish} onChange={e => setForm(f => ({ ...f, tanggal_publish: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={saveMut.isPending}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
                  {saveMut.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <p className="font-bold text-gray-800 mb-1">Hapus pengumuman?</p>
            <p className="text-sm text-gray-500 mb-5">Pengumuman tidak akan tampil di portal siswa.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold">Batal</button>
              <button onClick={() => deleteMut.mutate(deleteId!)} disabled={deleteMut.isPending}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60">
                {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
