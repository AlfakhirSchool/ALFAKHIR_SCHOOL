'use client';

import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

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
  const { user, updateUser } = useAuthStore();

  // Fetch guru profile to get school_levels + spesialisasi (handles old sessions)
  const { data: profileData } = useQuery({
    queryKey: ['guru-profile'],
    queryFn: () => api.get('/auth/me').then(r => {
      const d = r.data.data;
      if (d?.guru && !((user as any)?.school_levels)?.length) {
        updateUser({ school_levels: d.guru.school_levels || [], spesialisasi: d.guru.spesialisasi || '' });
      }
      return d;
    }),
    staleTime: 5 * 60 * 1000,
  });

  const schoolLevels: string[] = (user as any)?.school_levels?.length
    ? (user as any).school_levels
    : profileData?.guru?.school_levels || [];
  const spesialisasi: string = (user as any)?.spesialisasi || profileData?.guru?.spesialisasi || '';
  const spesSet = new Set(
    spesialisasi.split(',').map((s: string) => s.trim().split(':').slice(1).join(':').trim().toLowerCase()).filter(Boolean)
  );
  const [view, setView] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterTgl, setFilterTgl] = useState('');

  const { data: jurnalList, isLoading } = useQuery({
    queryKey: ['jurnal-guru'],
    queryFn: () => api.get('/jurnal-guru').then(r => r.data.data || []),
  });

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const filteredJurnal = filterTgl
    ? (jurnalList || []).filter((j: any) => j.tanggal?.split('T')[0] === filterTgl)
    : (jurnalList || []);


  const { data: mapelListRaw } = useQuery({
    queryKey: ['mapel-list', schoolLevels],
    queryFn: async () => {
      if (schoolLevels.length === 0) return api.get('/mata-pelajaran').then(r => r.data.data || []);
      const results = await Promise.all(schoolLevels.map(lvl => api.get('/mata-pelajaran', { params: { jenjang: lvl } }).then(r => r.data.data || [])));
      return results.flat();
    },
  });
  // Filter by spesialisasi if set, otherwise show all from school_levels
  const mapelList = (mapelListRaw || []).filter((m: any) =>
    spesSet.size === 0 || spesSet.has(m.nama.toLowerCase())
  );

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

  const [submitError, setSubmitError] = useState('');
  const [detailJurnal, setDetailJurnal] = useState<any>(null);

  const submitJurnal = useMutation({
    mutationFn: (id: string) => api.post(`/jurnal-guru/${id}/submit`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jurnal-guru'] }); setSubmitError(''); },
    onError: (e: any) => setSubmitError(e?.response?.data?.message || 'Gagal submit jurnal'),
  });

  const deleteJurnal = useMutation({
    mutationFn: (id: string) => api.delete(`/jurnal-guru/${id}`),
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

            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">{filteredJurnal.length} jurnal</p>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterTgl} onChange={e => setFilterTgl(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                  {filterTgl && <button onClick={() => setFilterTgl('')} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X size={12} />Reset</button>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const XLSX = await import('xlsx');
                    const rows = (jurnalList || []).map((j: any) => ({
                      'Tanggal': j.tanggal ? new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
                      'Kelas': j.kelas?.nama || '',
                      'Mata Pelajaran': j.mataPelajaran?.nama || '',
                      'Topik': j.topik_pelajaran || '',
                      'Deskripsi': j.deskripsi_pembelajaran || '',
                      'Hasil': j.hasil_pembelajaran || '',
                      'Tugas': j.tugas || '',
                      'Catatan': j.catatan_guru || '',
                      'Rencana Tindak Lanjut': j.rencana_tindak_lanjut || '',
                      'Status': j.status || '',
                    }));
                    const ws = XLSX.utils.json_to_sheet(rows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
                    XLSX.writeFile(wb, `Jurnal_${user?.nama?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
                  }}
                  className="px-4 py-2 border border-[#1B8B87] text-[#1B8B87] rounded-lg text-sm font-medium hover:bg-teal-50 flex items-center gap-1.5"
                >
                  <Download size={14} /> Download XLSX
                </button>
                <button
                  onClick={() => { setForm(emptyForm); setEditId(null); setView('form'); }}
                  className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#156f6c]"
                >
                  + Buat Jurnal Baru
                </button>
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 mb-3">{submitError}</div>
            )}
            <div className="space-y-3">
              {isLoading && <div className="text-center py-12 text-gray-400">Memuat...</div>}
              {!isLoading && filteredJurnal.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                  <p className="text-gray-400">{filterTgl ? 'Tidak ada jurnal pada tanggal ini.' : 'Belum ada jurnal. Klik tombol di atas untuk membuat.'}</p>
                </div>
              )}
              {filteredJurnal.map((j: any) => (
                <div key={j.id} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailJurnal(j)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-[#1A2332]">{j.topik_pelajaran}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[j.status]}`}>
                          {j.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {j.kelas?.nama} · {j.mataPelajaran?.nama || '—'} · {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      {j.status === 'draft' && (
                        <>
                          <button onClick={() => openEdit(j)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                          <button onClick={() => submitJurnal.mutate(j.id)} disabled={submitJurnal.isPending} className="text-xs px-3 py-1.5 bg-[#1B8B87] text-white rounded-lg hover:bg-[#156f6c] disabled:opacity-50">Submit</button>
                        </>
                      )}
                      <button
                        onClick={() => { if (confirm('Hapus jurnal ini?')) deleteJurnal.mutate(j.id); }}
                        disabled={deleteJurnal.isPending}
                        className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
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
                <X size={14} className="inline mr-1" />Batal
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

      {/* Modal Detail Jurnal */}
      {detailJurnal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetailJurnal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-semibold text-[#1A2332]">{detailJurnal.topik_pelajaran}</h2>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[detailJurnal.status]}`}>{detailJurnal.status}</span>
              </div>
              <button onClick={() => setDetailJurnal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div><span className="font-medium block">Kelas</span>{detailJurnal.kelas?.nama || '—'}</div>
                <div><span className="font-medium block">Mata Pelajaran</span>{detailJurnal.mataPelajaran?.nama || '—'}</div>
                <div><span className="font-medium block">Tanggal</span>{new Date(detailJurnal.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              {detailJurnal.deskripsi_pembelajaran && (
                <div><p className="text-xs font-medium text-gray-600 mb-1">Tugas</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailJurnal.deskripsi_pembelajaran}</p></div>
              )}
              {detailJurnal.hasil_pembelajaran && (
                <div><p className="text-xs font-medium text-gray-600 mb-1">Catatan Guru</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailJurnal.hasil_pembelajaran}</p></div>
              )}
              {detailJurnal.rencana_tindak_lanjut && (
                <div><p className="text-xs font-medium text-gray-600 mb-1">Rencana Tindak Lanjut</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailJurnal.rencana_tindak_lanjut}</p></div>
              )}
              <div className="flex gap-2 pt-2">
                {detailJurnal.status === 'draft' && (
                  <>
                    <button onClick={() => { openEdit(detailJurnal); setDetailJurnal(null); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Edit</button>
                    <button onClick={() => { submitJurnal.mutate(detailJurnal.id); setDetailJurnal(null); }} className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm hover:bg-[#156f6c]">Submit</button>
                  </>
                )}
                <button onClick={() => { if (confirm('Hapus jurnal ini?')) { deleteJurnal.mutate(detailJurnal.id); setDetailJurnal(null); } }} className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 ml-auto">Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
