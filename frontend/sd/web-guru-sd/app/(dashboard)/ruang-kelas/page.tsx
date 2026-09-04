'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Upload, FileText, BookOpen, X, Trash2, Download,
  Clock, Users, Link as LinkIcon, ChevronDown,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { api } from '@/lib/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '');

const fmtDeadline = (d: string) =>
  new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const isPast = (d: string) => new Date(d) < new Date();

type Sheet = 'materi' | 'tugas' | null;

export default function RuangKelasPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [kelasId, setKelasId] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [submissionsFor, setSubmissionsFor] = useState<any>(null);

  const [materiForm, setMateriForm] = useState({ judul: '', deskripsi: '', mata_pelajaran_id: '', link_video: '' });
  const [tugasForm, setTugasForm] = useState({ judul: '', deskripsi: '', mata_pelajaran_id: '', deadline: '', max_nilai: '100', link_video: '' });
  const [file, setFile] = useState<File | null>(null);

  const [nilaiInput, setNilaiInput] = useState<Record<string, { nilai: string; catatan: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-guru'],
    queryFn: async () => {
      const jadwal = await api.get('/jadwal-pelajaran').then((r: any) => r.data.data ?? []).catch(() => []);
      const seen = new Set<string>();
      return jadwal.map((j: any) => j.kelas).filter((k: any) => k && !seen.has(k.id) && seen.add(k.id));
    },
  });

  const { data: mapelList = [] } = useQuery({
    queryKey: ['mapel-guru'],
    queryFn: () => api.get('/mata-pelajaran').then((r: any) => r.data.data ?? []),
  });

  const { data: tugasList = [], isLoading: loadingTugas } = useQuery({
    queryKey: ['tugas-kelas', kelasId],
    queryFn: () => api.get('/tugas', { params: { kelas_id: kelasId } }).then((r: any) => r.data.data ?? []),
    enabled: !!kelasId,
  });

  const { data: materiList = [], isLoading: loadingMateri } = useQuery({
    queryKey: ['materi-kelas', kelasId],
    queryFn: () => api.get('/materi', { params: { kelas_id: kelasId } }).then((r: any) => r.data.data ?? []),
    enabled: !!kelasId,
  });

  const { data: submissions = [], isLoading: loadingSub } = useQuery({
    queryKey: ['submissions', submissionsFor?.id],
    queryFn: () => api.get(`/tugas/${submissionsFor.id}/submissions`).then((r: any) => r.data.data ?? []),
    enabled: !!submissionsFor,
  });

  // Feed gabungan materi + tugas, urut dari terbaru
  const feed = [...tugasList.map((t: any) => ({ ...t, _type: 'tugas' })),
                 ...materiList.map((m: any) => ({ ...m, _type: 'materi' }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ── Mutations ─────────────────────────────────────────────────────────────

  const uploadMateri = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('judul', materiForm.judul);
      if (materiForm.deskripsi) fd.append('deskripsi', materiForm.deskripsi);
      fd.append('mata_pelajaran_id', materiForm.mata_pelajaran_id);
      fd.append('kelas_id', kelasId);
      if (materiForm.link_video) fd.append('link_video', materiForm.link_video);
      if (file) fd.append('file', file);
      return api.post('/materi', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materi-kelas', kelasId] });
      setSheet(null);
      setMateriForm({ judul: '', deskripsi: '', mata_pelajaran_id: '', link_video: '' });
      setFile(null);
    },
  });

  const buatTugas = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('judul', tugasForm.judul);
      fd.append('kelas_id', kelasId);
      if (tugasForm.deskripsi) fd.append('deskripsi', tugasForm.deskripsi);
      if (tugasForm.mata_pelajaran_id) fd.append('mata_pelajaran_id', tugasForm.mata_pelajaran_id);
      fd.append('deadline', tugasForm.deadline);
      fd.append('max_nilai', tugasForm.max_nilai);
      if (tugasForm.link_video) fd.append('link_video', tugasForm.link_video);
      if (file) fd.append('file', file);
      return api.post('/tugas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tugas-kelas', kelasId] });
      setSheet(null);
      setTugasForm({ judul: '', deskripsi: '', mata_pelajaran_id: '', deadline: '', max_nilai: '100', link_video: '' });
      setFile(null);
    },
  });

  const deleteMateri = useMutation({
    mutationFn: (id: string) => api.delete(`/materi/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materi-kelas', kelasId] }),
  });

  const nilaiMutation = useMutation({
    mutationFn: ({ submissionId, nilai, catatan_guru }: any) =>
      api.put(`/tugas/submissions/${submissionId}/nilai`, { nilai: parseInt(nilai), catatan_guru }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submissions', submissionsFor?.id] }),
    onSettled: () => setSaving(null),
  });

  // ── Submissions view ──────────────────────────────────────────────────────

  if (submissionsFor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title={`Submissions: ${submissionsFor.judul}`} />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => setSubmissionsFor(null)} className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            ← Kembali
          </button>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 text-sm text-gray-600 flex gap-6 flex-wrap">
            <span>Deadline: <b className={isPast(submissionsFor.deadline) ? 'text-red-600' : 'text-gray-800'}>{fmtDeadline(submissionsFor.deadline)}</b></span>
            <span>Max nilai: <b>{submissionsFor.max_nilai}</b></span>
            <span>Terkumpul: <b>{submissions.length}</b></span>
          </div>
          {loadingSub ? <p className="text-center text-gray-400 py-10">Memuat...</p>
          : submissions.length === 0 ? <p className="text-center text-gray-400 py-10">Belum ada yang mengumpulkan.</p>
          : (
            <div className="space-y-3">
              {submissions.map((s: any) => {
                const inp = nilaiInput[s.id] ?? { nilai: s.nilai ?? '', catatan: s.catatan_guru ?? '' };
                return (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="font-medium text-gray-800">{s.siswa?.user?.nama ?? '—'}</p>
                    <p className="text-xs text-gray-400">{s.siswa?.nis} · {new Date(s.created_at).toLocaleString('id-ID')}</p>
                    {s.catatan_siswa && <p className="text-sm text-gray-600 mt-1">"{s.catatan_siswa}"</p>}
                    {s.file_url && (
                      <a href={`${API_BASE}${s.file_url}`} target="_blank" rel="noreferrer"
                        className="text-xs text-teal-600 underline mt-1 inline-block">📎 {s.file_name}</a>
                    )}
                    <div className="mt-3 flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Nilai (0–{submissionsFor.max_nilai})</label>
                        <input type="number" min={0} max={submissionsFor.max_nilai} value={inp.nilai}
                          onChange={e => setNilaiInput(p => ({ ...p, [s.id]: { ...inp, nilai: e.target.value } }))}
                          className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Catatan</label>
                        <input type="text" value={inp.catatan} placeholder="Catatan untuk siswa..."
                          onChange={e => setNilaiInput(p => ({ ...p, [s.id]: { ...inp, catatan: e.target.value } }))}
                          className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                      </div>
                      <button onClick={() => { setSaving(s.id); nilaiMutation.mutate({ submissionId: s.id, nilai: inp.nilai, catatan_guru: inp.catatan }); }}
                        disabled={!inp.nilai || saving === s.id}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">
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

  // ── Main feed ─────────────────────────────────────────────────────────────

  const isLoading = loadingTugas || loadingMateri;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Ruang Kelas" />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Pilih kelas */}
        <div className="relative">
          <select value={kelasId} onChange={e => setKelasId(e.target.value)}
            className="w-full appearance-none px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10">
            <option value="">Pilih Kelas</option>
            {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Feed */}
        {!kelasId ? (
          <div className="text-center py-16 text-gray-400 text-sm">Pilih kelas untuk melihat konten</div>
        ) : isLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
        ) : feed.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <BookOpen size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Belum ada konten</p>
            <p className="text-xs text-gray-400 mt-1">Klik "+" untuk tambah materi atau tugas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.map((item: any) => item._type === 'tugas' ? (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-1 bg-amber-400 w-full" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 uppercase">Tugas</span>
                        {item.mata_pelajaran && <span className="text-[10px] text-gray-400">{item.mata_pelajaran.nama}</span>}
                      </div>
                      <p className="font-semibold text-sm text-gray-800 mt-1">{item.judul}</p>
                      {item.deskripsi && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.deskripsi}</p>}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock size={11} className={isPast(item.deadline) ? 'text-red-400' : 'text-amber-500'} />
                        <span className={`text-[11px] ${isPast(item.deadline) ? 'text-red-500' : 'text-amber-600'}`}>
                          {fmtDeadline(item.deadline)}{isPast(item.deadline) ? ' (lewat)' : ''}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-2">Max: {item.max_nilai}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {item.file_url && (
                          <a href={`${API_BASE}${item.file_url}`} target="_blank" rel="noopener"
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-gray-100 rounded-lg text-gray-600">
                            <Download size={11} /> {item.file_name || 'File'}
                          </a>
                        )}
                        {item.link_video && (
                          <a href={item.link_video} target="_blank" rel="noopener"
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-blue-50 rounded-lg text-blue-600">
                            <LinkIcon size={11} /> Link
                          </a>
                        )}
                        <button onClick={() => setSubmissionsFor(item)}
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-teal-50 rounded-lg text-teal-700 ml-auto">
                          <Users size={11} /> Submissions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-1 bg-emerald-400 w-full" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={16} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase">Materi</span>
                        {item.mata_pelajaran && <span className="text-[10px] text-gray-400">{item.mata_pelajaran.nama}</span>}
                      </div>
                      <p className="font-semibold text-sm text-gray-800 mt-1">{item.judul}</p>
                      {item.deskripsi && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.deskripsi}</p>}
                      <div className="flex gap-2 mt-3">
                        {item.file_url && (
                          <a href={`${API_BASE}${item.file_url}`} target="_blank" rel="noopener"
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-gray-100 rounded-lg text-gray-600">
                            <Download size={11} /> {item.file_name || 'File'}
                          </a>
                        )}
                        {item.link_video && (
                          <a href={item.link_video} target="_blank" rel="noopener"
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-blue-50 rounded-lg text-blue-600">
                            <LinkIcon size={11} /> Link
                          </a>
                        )}
                        <button onClick={() => deleteMateri.mutate(item.id)}
                          className="ml-auto w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {kelasId && !sheet && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 items-end">
          <button onClick={() => setSheet('materi')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold shadow-lg">
            <BookOpen size={15} /> Materi
          </button>
          <button onClick={() => setSheet('tugas')}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-full text-sm font-semibold shadow-lg">
            <FileText size={15} /> Tugas
          </button>
        </div>
      )}

      {/* Sheet Materi */}
      {sheet === 'materi' && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setSheet(null); setFile(null); }} />
          <div className="relative bg-white rounded-t-3xl w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800 text-base">Tambah Materi</p>
              <button onClick={() => { setSheet(null); setFile(null); }}><X size={20} className="text-gray-400" /></button>
            </div>
            <input value={materiForm.judul} onChange={e => setMateriForm(f => ({ ...f, judul: e.target.value }))}
              placeholder="Judul materi *"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <select value={materiForm.mata_pelajaran_id} onChange={e => setMateriForm(f => ({ ...f, mata_pelajaran_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="">Pilih mata pelajaran *</option>
              {mapelList.map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </select>
            <textarea value={materiForm.deskripsi} onChange={e => setMateriForm(f => ({ ...f, deskripsi: e.target.value }))}
              rows={2} placeholder="Deskripsi (opsional)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            <input type="url" value={materiForm.link_video} onChange={e => setMateriForm(f => ({ ...f, link_video: e.target.value }))}
              placeholder="Link (YouTube, Drive, website, dll — opsional)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png,.mp4" className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 flex items-center justify-center gap-2 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
              <Upload size={16} /> {file ? file.name : 'Upload file (PDF/PPT/Word/Gambar)'}
            </button>
            <button onClick={() => uploadMateri.mutate()}
              disabled={uploadMateri.isPending || !materiForm.judul || !materiForm.mata_pelajaran_id}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {uploadMateri.isPending ? 'Menyimpan...' : 'Simpan Materi'}
            </button>
          </div>
        </div>
      )}

      {/* Sheet Tugas */}
      {sheet === 'tugas' && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setSheet(null); setFile(null); }} />
          <div className="relative bg-white rounded-t-3xl w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800 text-base">Buat Tugas</p>
              <button onClick={() => { setSheet(null); setFile(null); }}><X size={20} className="text-gray-400" /></button>
            </div>
            <input value={tugasForm.judul} onChange={e => setTugasForm(f => ({ ...f, judul: e.target.value }))}
              placeholder="Judul tugas *"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <select value={tugasForm.mata_pelajaran_id} onChange={e => setTugasForm(f => ({ ...f, mata_pelajaran_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">Pilih mata pelajaran (opsional)</option>
              {mapelList.map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </select>
            <textarea value={tugasForm.deskripsi} onChange={e => setTugasForm(f => ({ ...f, deskripsi: e.target.value }))}
              rows={3} placeholder="Instruksi / deskripsi tugas"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            <input type="url" value={tugasForm.link_video} onChange={e => setTugasForm(f => ({ ...f, link_video: e.target.value }))}
              placeholder="Link referensi (opsional)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Deadline *</label>
                <input type="datetime-local" value={tugasForm.deadline} onChange={e => setTugasForm(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nilai max</label>
                <input type="number" min={1} max={1000} value={tugasForm.max_nilai}
                  onChange={e => setTugasForm(f => ({ ...f, max_nilai: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 flex items-center justify-center gap-2 hover:border-amber-400 hover:text-amber-600 transition-colors">
              <Upload size={16} /> {file ? file.name : 'Lampiran soal (opsional)'}
            </button>
            <button onClick={() => buatTugas.mutate()}
              disabled={buatTugas.isPending || !tugasForm.judul || !tugasForm.deadline}
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {buatTugas.isPending ? 'Menyimpan...' : 'Buat Tugas'}
            </button>
            {buatTugas.isError && (
              <p className="text-xs text-red-600 text-center">{(buatTugas.error as any)?.response?.data?.message ?? 'Gagal membuat tugas'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
