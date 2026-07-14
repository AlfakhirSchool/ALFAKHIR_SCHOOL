'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-50 text-blue-700',
  reviewed: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
};

const emptyForm = {
  kelas_id: '', mata_pelajaran_id: '', tanggal: new Date().toISOString().split('T')[0],
  topik_pelajaran: '', deskripsi_pembelajaran: '', hasil_pembelajaran: '', rencana_tindak_lanjut: '',
};

export default function JurnalPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: jurnalList, isLoading } = useQuery({
    queryKey: ['jurnal-guru'],
    queryFn: () => api.get('/jurnal-guru').then(r => r.data.data || []),
  });

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data: mapelList } = useQuery({
    queryKey: ['mapel-list'],
    queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data || []),
  });

  const saveJurnal = useMutation({
    mutationFn: () => editId
      ? api.put(`/jurnal-guru/${editId}`, form)
      : api.post('/jurnal-guru', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jurnal-guru'] });
      setView('list');
      setForm(emptyForm);
      setEditId(null);
    },
  });

  const submitJurnal = useMutation({
    mutationFn: (id: string) => api.post(`/jurnal-guru/${id}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jurnal-guru'] }),
  });

  const openEdit = (j: any) => {
    setForm({
      kelas_id: j.kelas_id, mata_pelajaran_id: j.mata_pelajaran_id,
      tanggal: j.tanggal?.split('T')[0] || '',
      topik_pelajaran: j.topik_pelajaran || '',
      deskripsi_pembelajaran: j.deskripsi_pembelajaran || '',
      hasil_pembelajaran: j.hasil_pembelajaran || '',
      rencana_tindak_lanjut: j.rencana_tindak_lanjut || '',
    });
    setEditId(j.id);
    setView('form');
  };

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  return (
    <div>
      <Header title="Jurnal Guru" />
      <div className="p-6">

        {view === 'list' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-gray-500">{jurnalList?.length || 0} jurnal</p>
              <button
                onClick={() => { setForm(emptyForm); setEditId(null); setView('form'); }}
                className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#156f6c]"
              >
                + Buat Jurnal Baru
              </button>
            </div>

            <div className="space-y-3">
              {isLoading && <div className="text-center py-12 text-gray-400">Memuat...</div>}
              {!isLoading && (jurnalList || []).length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                  <p className="text-gray-400">Belum ada jurnal. Klik tombol di atas untuk membuat.</p>
                </div>
              )}
              {(jurnalList || []).map((j: any) => (
                <div key={j.id} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-[#1A2332]">{j.topik_pelajaran}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[j.status]}`}>
                          {j.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {j.kelas?.nama} · {j.mataPelajaran?.nama} · {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {j.status === 'draft' && (
                        <>
                          <button
                            onClick={() => openEdit(j)}
                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => submitJurnal.mutate(j.id)}
                            disabled={submitJurnal.isPending}
                            className="text-xs px-3 py-1.5 bg-[#1B8B87] text-white rounded-lg hover:bg-[#156f6c] disabled:opacity-50"
                          >
                            Submit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {j.hambatan_pembelajaran && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-1">
                      Hambatan: {j.hambatan_pembelajaran}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'form' && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-[#1A2332]">
                {editId ? 'Edit Jurnal' : 'Buat Jurnal Baru'}
              </h2>
              <button onClick={() => { setView('list'); setForm(emptyForm); setEditId(null); }} className="text-gray-400 hover:text-gray-600">
                ✕ Batal
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
                  <select value={form.kelas_id} onChange={(e) => f('kelas_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Kelas --</option>
                    {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran</label>
                  <select value={form.mata_pelajaran_id} onChange={(e) => f('mata_pelajaran_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Mapel --</option>
                    {(mapelList || []).map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                <input type="date" value={form.tanggal} onChange={(e) => f('tanggal', e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Topik *</label>
                <input value={form.topik_pelajaran} onChange={(e) => f('topik_pelajaran', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]"
                  placeholder="Topik pelajaran hari ini..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tugas</label>
                <textarea value={form.deskripsi_pembelajaran} onChange={(e) => f('deskripsi_pembelajaran', e.target.value)}
                  rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] resize-none"
                  placeholder="Tugas yang diberikan kepada siswa..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catatan Guru</label>
                <textarea value={form.hasil_pembelajaran} onChange={(e) => f('hasil_pembelajaran', e.target.value)}
                  rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] resize-none"
                  placeholder="Catatan atau kondisi kelas hari ini..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rencana Tindak Lanjut</label>
                <textarea value={form.rencana_tindak_lanjut} onChange={(e) => f('rencana_tindak_lanjut', e.target.value)}
                  rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] resize-none"
                  placeholder="Rencana pertemuan berikutnya..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => saveJurnal.mutate()}
                  disabled={!form.topik_pelajaran || !form.kelas_id || saveJurnal.isPending}
                  className="flex-1 py-3 bg-[#1B8B87] text-white rounded-lg font-semibold hover:bg-[#156f6c] disabled:opacity-50"
                >
                  {saveJurnal.isPending ? 'Menyimpan...' : 'Simpan sebagai Draft'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
