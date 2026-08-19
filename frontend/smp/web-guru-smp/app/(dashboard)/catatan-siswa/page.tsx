'use client';
import AuthImage from '@/components/AuthImage';

import { useState, useRef } from 'react';
import { ChevronLeft, Save, Camera, Image as ImageIcon, X, Plus, Trash2, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function CatatanSiswaPage() {
  const qc = useQueryClient();

  const [view, setView] = useState<'list' | 'form'>('list');
  const [filterKelasId, setFilterKelasId] = useState('');
  const [filterSiswaId, setFilterSiswaId] = useState('');

  // Form state
  const [formKelasId, setFormKelasId] = useState('');
  const [formSiswaId, setFormSiswaId] = useState('');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formJudul, setFormJudul] = useState('');
  const [formIsi, setFormIsi] = useState('');
  const [formFoto, setFormFoto] = useState<File | null>(null);
  const [formFotoPreview, setFormFotoPreview] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [existingFotoUrl, setExistingFotoUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Kelas list
  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-catatan'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  // Siswa list berdasarkan kelas yang dipilih (list view filter)
  const { data: siswaNyaFilter = [] } = useQuery({
    queryKey: ['siswa-filter-catatan', filterKelasId],
    queryFn: () => api.get(`/kelas/${filterKelasId}/siswa`).then(r => r.data.data || []),
    enabled: !!filterKelasId,
  });

  // Siswa list berdasarkan kelas yang dipilih (form)
  const { data: siswaForm = [] } = useQuery({
    queryKey: ['siswa-form-catatan', formKelasId],
    queryFn: () => api.get(`/kelas/${formKelasId}/siswa`).then(r => r.data.data || []),
    enabled: !!formKelasId,
  });

  // Catatan list
  const { data: catatanList = [], isLoading } = useQuery({
    queryKey: ['catatan-siswa-list', filterSiswaId],
    queryFn: () => api.get('/catatan-siswa', { params: filterSiswaId ? { siswa_id: filterSiswaId } : {} }).then(r => r.data.data || []),
  });

  const simpan = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('siswa_id', formSiswaId);
      fd.append('tanggal', formTanggal);
      if (formJudul) fd.append('judul', formJudul);
      fd.append('isi', formIsi);
      if (formFoto) fd.append('foto', formFoto);

      if (editId) {
        return api.put(`/catatan-siswa/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return api.post('/catatan-siswa', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catatan-siswa-list'] });
      setFeedback({ type: 'ok', msg: 'Catatan berhasil disimpan!' });
      setTimeout(() => { setFeedback(null); backToList(); }, 1200);
    },
    onError: (e: any) => {
      setFeedback({ type: 'err', msg: e.response?.data?.message || 'Gagal menyimpan' });
    },
  });

  const hapus = useMutation({
    mutationFn: (id: string) => api.delete(`/catatan-siswa/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catatan-siswa-list'] }),
  });

  const backToList = () => {
    setView('list');
    setEditId(null);
    setFormKelasId('');
    setFormSiswaId('');
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormJudul('');
    setFormIsi('');
    setFormFoto(null);
    setFormFotoPreview(null);
    setExistingFotoUrl(null);
  };

  const openNew = () => {
    backToList();
    setView('form');
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setFormSiswaId(c.siswa_id);
    setFormKelasId(c.siswa?.kelas_id || '');
    setFormTanggal(c.tanggal || new Date().toISOString().split('T')[0]);
    setFormJudul(c.judul || '');
    setFormIsi(c.isi || '');
    setFormFoto(null);
    setFormFotoPreview(null);
    setExistingFotoUrl(c.foto_url || null);
    setView('form');
  };

  const onFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto maksimal 2MB. Silakan pilih foto yang lebih kecil.');
      e.target.value = '';
      return;
    }
    setFormFoto(file);
    setFormFotoPreview(URL.createObjectURL(file));
  };

  const siswaMap: Record<string, any> = {};
  (siswaNyaFilter as any[]).forEach((s: any) => { siswaMap[s.id] = s; });
  const siswaFormMap: Record<string, any> = {};
  (siswaForm as any[]).forEach((s: any) => { siswaFormMap[s.id] = s; });

  const filteredCatatan = (catatanList as any[]);

  return (
    <div>
      <Header title="Catatan Siswa" />
      <div className="p-6">

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-gray-500">{filteredCatatan.length} catatan</p>
                {/* Filter kelas */}
                <select value={filterKelasId} onChange={e => { setFilterKelasId(e.target.value); setFilterSiswaId(''); }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                  <option value="">Semua Kelas</option>
                  {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                {/* Filter siswa (muncul setelah kelas dipilih) */}
                {filterKelasId && (
                  <select value={filterSiswaId} onChange={e => setFilterSiswaId(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">Semua Siswa</option>
                    {(siswaNyaFilter as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.user?.nama || s.nama}</option>)}
                  </select>
                )}
              </div>
              <button onClick={openNew}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#156f6c]">
                <Plus size={15} /> Catatan Baru
              </button>
            </div>

            {isLoading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
            {!isLoading && filteredCatatan.length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <p className="text-gray-400 text-sm">Belum ada catatan. Klik "Catatan Baru" untuk mulai.</p>
              </div>
            )}

            <div className="space-y-3">
              {filteredCatatan.map((c: any) => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm p-5 flex gap-4">
                  {/* Foto thumbnail */}
                  {c.foto_url && (
                    <AuthImage src={c.foto_url} alt="foto"
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#1A2332] text-sm">
                          {c.siswa?.user?.nama || '—'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {c.siswa?.kelas?.nama || '—'} · {c.tanggal ? new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                          {c.guru?.user?.nama ? ` · oleh ${c.guru.user.nama}` : ''}
                        </p>
                        {c.judul && <p className="text-xs font-medium text-[#1B8B87] mt-1">{c.judul}</p>}
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{c.isi}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => openEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-[#1B8B87] rounded-lg hover:bg-teal-50">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => { if (confirm('Hapus catatan ini?')) hapus.mutate(c.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* FORM VIEW */}
        {view === 'form' && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-[#1A2332]">{editId ? 'Edit Catatan' : 'Catatan Baru'}</h2>
              <button onClick={backToList}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                <ChevronLeft size={14} /> Kembali
              </button>
            </div>

            <div className="space-y-4">
              {/* Pilih Kelas */}
              {!editId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kelas *</label>
                  <select value={formKelasId} onChange={e => { setFormKelasId(e.target.value); setFormSiswaId(''); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Pilih Kelas --</option>
                    {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
              )}

              {/* Pilih Siswa */}
              {!editId && formKelasId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Siswa *</label>
                  <select value={formSiswaId} onChange={e => setFormSiswaId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Pilih Siswa --</option>
                    {(siswaForm as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.user?.nama || s.nama}</option>)}
                  </select>
                </div>
              )}

              {/* Info siswa saat edit */}
              {editId && (
                <div className="p-3 bg-teal-50 rounded-lg text-sm text-[#1B8B87] font-medium">
                  Siswa: {(catatanList as any[]).find((c: any) => c.id === editId)?.siswa?.user?.nama || '—'}
                </div>
              )}

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal *</label>
                <input type="date" value={formTanggal} onChange={e => setFormTanggal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
              </div>

              {/* Judul */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Judul (opsional)</label>
                <input value={formJudul} onChange={e => setFormJudul(e.target.value)}
                  placeholder="Misal: Pelanggaran disiplin, Prestasi, dll..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
              </div>

              {/* Isi */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Isi Catatan *</label>
                <textarea value={formIsi} onChange={e => setFormIsi(e.target.value)}
                  placeholder="Tulis catatan untuk siswa ini..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] resize-y" />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Foto (opsional)</label>
                {/* Preview */}
                {(formFotoPreview || existingFotoUrl) && (
                  <div className="relative inline-block mb-2">
                    {formFotoPreview ? <img src={formFotoPreview} alt="preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200" /> : <AuthImage src={existingFotoUrl || ''} alt="preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200" />}
                    <button onClick={() => { setFormFoto(null); setFormFotoPreview(null); setExistingFotoUrl(null); }}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <X size={10} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                    <Camera size={14} /> Kamera
                  </button>
                  <button type="button" onClick={() => galleryRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                    <ImageIcon size={14} /> Galeri
                  </button>
                </div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={onFotoChange} />
                <input ref={galleryRef} type="file" accept="image/*"
                  className="hidden" onChange={onFotoChange} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => simpan.mutate()}
                disabled={simpan.isPending || !formSiswaId || !formIsi.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-semibold hover:bg-[#156f6c] disabled:opacity-50">
                <Save size={15} />
                {simpan.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
              {feedback && (
                <span className={`text-sm font-medium ${feedback.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                  {feedback.msg}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
