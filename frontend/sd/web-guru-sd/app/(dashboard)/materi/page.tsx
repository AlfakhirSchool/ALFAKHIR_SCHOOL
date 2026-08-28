'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, FileText, BookOpen, X, Trash2, Download } from 'lucide-react';
import Header from '@/components/layout/Header';
import { api } from '@/lib/api';

export default function MateriGuruPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMapel, setSelectedMapel] = useState('');
  const [form, setForm] = useState({ judul: '', deskripsi: '', mata_pelajaran_id: '', kelas_id: '', link_video: '' });
  const [file, setFile] = useState<File | null>(null);

  const { data: mapelList = [] } = useQuery({
    queryKey: ['mapel-guru'],
    queryFn: () => api.get('/mata-pelajaran').then((r: any) => r.data.data ?? []),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-guru'],
    queryFn: async () => {
      const jadwal = await api.get('/jadwal-pelajaran').then((r: any) => r.data.data ?? []).catch(() => []);
      const map = new Map<string, any>();
      jadwal.forEach((j: any) => { if (j.kelas) map.set(j.kelas.id, j.kelas); });
      return Array.from(map.values());
    },
  });

  const { data: materiList = [], isLoading } = useQuery({
    queryKey: ['materi-guru', selectedMapel],
    queryFn: () => api.get('/materi', { params: selectedMapel ? { mata_pelajaran_id: selectedMapel } : {} }).then((r: any) => r.data.data ?? []),
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('judul', form.judul);
      if (form.deskripsi) fd.append('deskripsi', form.deskripsi);
      fd.append('mata_pelajaran_id', form.mata_pelajaran_id);
      if (form.kelas_id) fd.append('kelas_id', form.kelas_id);
      if (form.link_video) fd.append('link_video', form.link_video);
      if (file) fd.append('file', file);
      return api.post('/materi', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materi-guru'] });
      setShowForm(false);
      setForm({ judul: '', deskripsi: '', mata_pelajaran_id: '', kelas_id: '', link_video: '' });
      setFile(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/materi/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materi-guru'] }),
  });

  const fmt = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Materi Pelajaran" />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Filter + Tambah */}
        <div className="flex gap-2">
          <select value={selectedMapel} onChange={e => setSelectedMapel(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]">
            <option value="">Semua Mata Pelajaran</option>
            {mapelList.map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
          </select>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#10B981] text-white rounded-xl text-sm font-semibold">
            <Plus size={16} /> Tambah
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Memuat...</div>
        ) : materiList.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <BookOpen size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Belum ada materi</p>
            <p className="text-xs text-gray-400 mt-1">Klik "Tambah" untuk upload materi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materiList.map((m: any) => (
              <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-[#10B981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{m.judul}</p>
                      {m.mata_pelajaran && <p className="text-xs text-emerald-600 mt-0.5">{m.mata_pelajaran.nama}</p>}
                      {m.kelas && <p className="text-xs text-gray-400">{m.kelas.nama}</p>}
                      {m.deskripsi && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.deskripsi}</p>}
                      {m.file_name && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{m.file_name}</span>
                          {m.file_size && <span className="text-[10px] text-gray-400">{fmt(m.file_size)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {m.file_url && (
                      <a href={`http://localhost:3001${m.file_url}`} target="_blank" rel="noopener"
                        className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Download size={14} className="text-[#10B981]" />
                      </a>
                    )}
                    <button onClick={() => deleteMut.mutate(m.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-3xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800 text-base">Upload Materi Baru</p>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Judul Materi *</label>
              <input value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))}
                placeholder="Contoh: Perkalian Dasar — Bab 3"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mata Pelajaran *</label>
              <select value={form.mata_pelajaran_id} onChange={e => setForm(f => ({ ...f, mata_pelajaran_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                <option value="">Pilih mata pelajaran</option>
                {mapelList.map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Kelas (opsional)</label>
              <select value={form.kelas_id} onChange={e => setForm(f => ({ ...f, kelas_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                <option value="">Semua kelas</option>
                {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Deskripsi (opsional)</label>
              <textarea value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
                rows={2} placeholder="Keterangan singkat materi ini..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Link Video (YouTube/Google Drive, opsional)</label>
              <input type="url" value={form.link_video}
                onChange={e => setForm(f => ({ ...f, link_video: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">File (PDF/PPT/Word/Gambar)</label>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png"
                onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 flex items-center justify-center gap-2 hover:border-[#10B981] hover:text-[#10B981] transition-colors">
                <Upload size={16} />
                {file ? file.name : 'Pilih file...'}
              </button>
            </div>

            <button onClick={() => uploadMut.mutate()}
              disabled={uploadMut.isPending || !form.judul || !form.mata_pelajaran_id}
              className="w-full py-3 bg-[#10B981] text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {uploadMut.isPending ? 'Mengupload...' : 'Upload Materi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
