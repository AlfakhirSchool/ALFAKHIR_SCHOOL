'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, FileText, Clock, Users, ChevronLeft, CheckCircle, X, Star } from 'lucide-react';
import Header from '@/components/layout/Header';
import { api } from '@/lib/api';

const formatDeadline = (d: string) =>
  new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const isPast = (d: string) => new Date(d) < new Date();

export default function TugasGuruPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<'list' | 'buat' | 'submissions'>('list');
  const [selectedTugas, setSelectedTugas] = useState<any>(null);
  const [kelasId, setKelasId] = useState('');
  const [form, setForm] = useState({
    judul: '', jenis: 'tugas', deskripsi: '', kelas_id: '', mata_pelajaran_id: '',
    tgl_diberikan: new Date().toISOString().split('T')[0], deadline: '', max_nilai: '100',
  });
  const [file, setFile] = useState<File | null>(null);
  const [nilaiInput, setNilaiInput] = useState<Record<string, { nilai: string; catatan: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Data profil guru
  const { data: profile } = useQuery({
    queryKey: ['guru-profile'],
    queryFn: () => api.get('/auth/me').then((r: any) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  // List kelas yang diampu guru ini (via jadwal pelajaran)
  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-guru'],
    queryFn: async () => {
      const jadwal = await api.get('/jadwal-pelajaran').then((r: any) => r.data.data ?? []).catch(() => []);
      const seen = new Set<string>();
      return jadwal
        .map((j: any) => j.kelas)
        .filter((k: any) => k && !seen.has(k.id) && seen.add(k.id));
    },
  });

  // Mapel dari jadwal guru, difilter per kelas yang dipilih di form
  const { data: jadwalAll = [] } = useQuery({
    queryKey: ['jadwal-all-guru'],
    queryFn: () => api.get('/jadwal-pelajaran').then((r: any) => r.data.data ?? []),
  });
  const mapelList = form.kelas_id
    ? (jadwalAll as any[])
        .filter((j: any) => j.kelas_id === form.kelas_id && j.mataPelajaran)
        .map((j: any) => j.mataPelajaran)
        .filter((m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === m.id) === i)
    : [];

  // List tugas per kelas
  const { data: tugasList = [], isLoading } = useQuery({
    queryKey: ['tugas', kelasId],
    queryFn: () => api.get('/tugas', { params: { kelas_id: kelasId } }).then((r: any) => r.data.data ?? []),
    enabled: !!kelasId,
  });

  // Submissions
  const { data: submissions = [], isLoading: loadingSub } = useQuery({
    queryKey: ['submissions', selectedTugas?.id],
    queryFn: () => api.get(`/tugas/${selectedTugas.id}/submissions`).then((r: any) => r.data.data ?? []),
    enabled: !!selectedTugas,
  });

  // Buat tugas
  const buatMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (file) fd.append('file', file);
      return api.post('/tugas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tugas', form.kelas_id] });
      setView('list');
      setKelasId(form.kelas_id);
      setForm({ judul: '', jenis: 'tugas', deskripsi: '', kelas_id: '', mata_pelajaran_id: '', tgl_diberikan: new Date().toISOString().split('T')[0], deadline: '', max_nilai: '100' });
      setFile(null);
    },
  });

  // Beri nilai
  const nilaiMutation = useMutation({
    mutationFn: ({ submissionId, nilai, catatan_guru }: any) =>
      api.put(`/tugas/submissions/${submissionId}/nilai`, { nilai: parseInt(nilai), catatan_guru }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submissions', selectedTugas?.id] }),
    onSettled: (_, __, vars) => setSaving(null),
  });

  // ── Render ────────────────────────────────────────────────────────────────

  if (view === 'submissions' && selectedTugas) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title={`Submissions: ${selectedTugas.judul}`} />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button onClick={() => { setView('list'); setSelectedTugas(null); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ChevronLeft size={16} /> Kembali
          </button>

          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 text-sm text-gray-600 flex gap-6">
            <span>Deadline: <b className={isPast(selectedTugas.deadline) ? 'text-red-600' : 'text-gray-800'}>{formatDeadline(selectedTugas.deadline)}</b></span>
            <span>Max nilai: <b>{selectedTugas.max_nilai}</b></span>
            <span>Terkumpul: <b>{submissions.length}</b></span>
          </div>

          {loadingSub ? (
            <p className="text-center text-gray-400 py-10">Memuat...</p>
          ) : submissions.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Belum ada yang mengumpulkan.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((s: any) => {
                const inp = nilaiInput[s.id] ?? { nilai: s.nilai ?? '', catatan: s.catatan_guru ?? '' };
                return (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-800">{s.siswa?.user?.nama ?? '—'}</p>
                        <p className="text-xs text-gray-400">{s.siswa?.nis} · Dikumpulkan {new Date(s.created_at).toLocaleString('id-ID')}</p>
                        {s.catatan_siswa && <p className="text-sm text-gray-600 mt-1">"{s.catatan_siswa}"</p>}
                        {s.file_url && (
                          <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${s.file_url}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-teal-600 underline mt-1 inline-block">
                            📎 {s.file_name}
                          </a>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {s.nilai != null && (
                          <span className="text-sm font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg">
                            {s.nilai}/{selectedTugas.max_nilai}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Nilai (0–{selectedTugas.max_nilai})</label>
                        <input type="number" min={0} max={selectedTugas.max_nilai}
                          value={inp.nilai}
                          onChange={e => setNilaiInput(prev => ({ ...prev, [s.id]: { ...inp, nilai: e.target.value } }))}
                          className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Catatan (opsional)</label>
                        <input type="text"
                          value={inp.catatan}
                          onChange={e => setNilaiInput(prev => ({ ...prev, [s.id]: { ...inp, catatan: e.target.value } }))}
                          placeholder="Catatan untuk siswa..."
                          className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <button
                        onClick={() => { setSaving(s.id); nilaiMutation.mutate({ submissionId: s.id, nilai: inp.nilai, catatan_guru: inp.catatan }); }}
                        disabled={!inp.nilai || saving === s.id}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors">
                        {saving === s.id ? '...' : 'Simpan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'buat') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Buat Tugas Baru" />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ChevronLeft size={16} /> Kembali
          </button>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tugas/Proyek/Ulangan *</label>
                <input value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Contoh: Latihan Soal Bab 3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis *</label>
                <select value={form.jenis} onChange={e => setForm(p => ({ ...p, jenis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="tugas">Tugas</option>
                  <option value="proyek">Proyek</option>
                  <option value="ulangan_harian">Ulangan Harian</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kelas *</label>
                <select value={form.kelas_id} onChange={e => setForm(p => ({ ...p, kelas_id: e.target.value, mata_pelajaran_id: '' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                <select value={form.mata_pelajaran_id} onChange={e => setForm(p => ({ ...p, mata_pelajaran_id: e.target.value }))}
                  disabled={!form.kelas_id}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400">
                  <option value="">{form.kelas_id ? '-- Pilih (opsional) --' : '-- Pilih kelas dulu --'}</option>
                  {mapelList.map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi / Instruksi</label>
              <textarea value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))}
                rows={4} placeholder="Tuliskan instruksi tugas..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tgl Diberikan *</label>
                <input type="date" value={form.tgl_diberikan} onChange={e => setForm(p => ({ ...p, tgl_diberikan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tgl Pengumpulan *</label>
                <input type="datetime-local" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Maksimal</label>
                <input type="number" min={1} max={1000} value={form.max_nilai}
                  onChange={e => setForm(p => ({ ...p, max_nilai: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lampiran (opsional, maks 10MB)</label>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-teal-400 transition-colors">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-teal-700">
                    <FileText size={16} /> {file.name}
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 flex flex-col items-center gap-1">
                    <Upload size={20} />
                    <span>Klik untuk upload file</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
            </div>

            <button
              onClick={() => buatMutation.mutate()}
              disabled={!form.judul || !form.kelas_id || !form.deadline || buatMutation.isPending}
              className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors">
              {buatMutation.isPending ? 'Menyimpan...' : 'Buat Tugas'}
            </button>
            {buatMutation.isError && (
              <p className="text-sm text-red-600 text-center">{(buatMutation.error as any)?.response?.data?.message ?? 'Gagal membuat tugas'}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Manajemen Tugas" />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Kelas:</label>
            <select value={kelasId} onChange={e => setKelasId(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <button onClick={() => setView('buat')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors">
            <Plus size={16} /> Buat Tugas
          </button>
        </div>

        {!kelasId ? (
          <div className="text-center text-gray-400 py-16">Pilih kelas untuk melihat tugas</div>
        ) : isLoading ? (
          <div className="text-center text-gray-400 py-16">Memuat...</div>
        ) : tugasList.length === 0 ? (
          <div className="text-center text-gray-400 py-16">Belum ada tugas di kelas ini</div>
        ) : (
          <div className="space-y-3">
            {tugasList.map((t: any) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{t.judul}</p>
                  {t.deskripsi && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{t.deskripsi}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className={`flex items-center gap-1 ${isPast(t.deadline) ? 'text-red-500' : 'text-amber-600'}`}>
                      <Clock size={12} /> {formatDeadline(t.deadline)}
                      {isPast(t.deadline) && ' (lewat)'}
                    </span>
                    <span>Max: {t.max_nilai}</span>
                    {t.file_name && <span>📎 {t.file_name}</span>}
                  </div>
                </div>
                <button onClick={() => { setSelectedTugas(t); setView('submissions'); }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-medium hover:bg-teal-100 transition-colors">
                  <Users size={13} /> Submissions
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
