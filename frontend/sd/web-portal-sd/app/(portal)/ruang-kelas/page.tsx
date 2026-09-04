'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, FileText, Clock, Download, Link as LinkIcon,
  Upload, X, CheckCircle, AlertCircle, ClipboardList,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '');

function fmtDeadline(d: string) {
  return new Date(d).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function sisaHariLabel(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  return `${diff} hari lagi`;
}

export default function RuangKelasPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isSiswa = user?.role === 'siswa';
  const [selectedTugas, setSelectedTugas] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [catatan, setCatatan] = useState('');
  const [tab, setTab] = useState<'semua' | 'tugas' | 'materi'>('semua');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => api.get('/portal/dashboard').then(r => r.data.data),
    enabled: isSiswa,
    staleTime: 60_000,
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (file) fd.append('file', file);
      if (catatan) fd.append('catatan_siswa', catatan);
      return api.post(`/tugas/${selectedTugas.id}/submit`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-dashboard'] });
      setSelectedTugas(null); setFile(null); setCatatan('');
    },
  });

  const tugasList: any[] = dashboard?.tugas ?? [];
  const materiList: any[] = dashboard?.materi ?? [];
  const now = new Date();

  const tugasFeed = tugasList.map((t: any) => ({ ...t, _type: 'tugas' }));
  const materiFeed = materiList.map((m: any) => ({ ...m, _type: 'materi' }));

  const feed = (tab === 'tugas' ? tugasFeed
    : tab === 'materi' ? materiFeed
    : [...tugasFeed, ...materiFeed])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const aktif = tugasList.filter((t: any) => !t.submission_saya?.status && new Date(t.deadline) > now).length;
  const selesai = tugasList.filter((t: any) => t.submission_saya?.status).length;
  const terlambat = tugasList.filter((t: any) => !t.submission_saya?.status && new Date(t.deadline) <= now).length;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#e9e0d8]">
        <div className="flex items-center gap-2.5 px-4 h-14">
          <div className="w-8 h-8 rounded-xl bg-[#1B8B87]/10 flex items-center justify-center">
            <BookOpen size={16} className="text-[#1B8B87]" />
          </div>
          <h1 className="font-black text-[#191c1e] text-base">Ruang Kelas</h1>
        </div>

        {/* Stats bar */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Aktif', count: aktif, bg: '#ffdbc8', color: '#994700' },
            { label: 'Selesai', count: selesai, bg: '#ecfdf5', color: '#059669' },
            { label: 'Terlambat', count: terlambat, bg: '#fef2f2', color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: s.bg }}>
              <span className="font-black text-xl leading-none" style={{ color: s.color }}>{s.count}</span>
              <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tab filter */}
        <div className="flex border-t border-[#e9e0d8]">
          {(['semua', 'tugas', 'materi'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                tab === t ? 'text-[#1B8B87] border-b-2 border-[#1B8B87]' : 'text-gray-400'
              }`}>
              {t === 'semua' ? 'Semua' : t === 'tugas' ? 'Tugas' : 'Materi'}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 pb-28 space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-[#8b7265] text-sm">Memuat...</div>
        ) : feed.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <ClipboardList size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Belum ada konten</p>
          </div>
        ) : feed.map((item: any) => item._type === 'tugas' ? (
          <TugasCard key={item.id} t={item} now={now} onSubmit={() => setSelectedTugas(item)} />
        ) : (
          <MateriCard key={item.id} m={item} />
        ))}
      </div>

      {/* Submit sheet */}
      {selectedTugas && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedTugas(null)} />
          <div className="relative bg-white rounded-t-3xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-[#e9e0d8] mx-auto mb-2" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#191c1e]">Kumpulkan Tugas</p>
                <p className="text-xs text-[#8b7265]">{selectedTugas.judul}</p>
              </div>
              <button onClick={() => setSelectedTugas(null)} className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                <X size={16} className="text-[#565e74]" />
              </button>
            </div>
            <input ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3.5 border-2 border-dashed border-[#e9e0d8] rounded-2xl text-sm text-[#565e74] flex items-center justify-center gap-2 hover:border-[#1B8B87] hover:text-[#1B8B87] transition-colors">
              <Upload size={16} /> {file ? file.name : 'Pilih file jawaban...'}
            </button>
            <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={3}
              placeholder="Catatan untuk guru (opsional)"
              className="w-full px-3 py-2.5 border border-[#e9e0d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87] resize-none" />
            <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending || (!file && !catatan)}
              className="w-full py-3.5 bg-[#1B8B87] text-white rounded-2xl font-bold text-sm disabled:opacity-50">
              {submitMut.isPending ? 'Mengumpulkan...' : 'Kumpulkan Tugas'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TugasCard({ t, now, onSubmit }: { t: any; now: Date; onSubmit: () => void }) {
  const deadline = t.deadline ? new Date(t.deadline) : null;
  const overdue = deadline && deadline < now;
  const sudahKumpul = t.submission_saya?.status;
  const sisa = deadline && !overdue ? sisaHariLabel(t.deadline) : null;
  const urgent = sisa === 'Hari ini' || sisa === 'Besok';

  const color = sudahKumpul ? '#059669' : overdue ? '#ef4444' : urgent ? '#f47b20' : '#3b5bdb';
  const bg = sudahKumpul ? '#ecfdf5' : overdue ? '#fef2f2' : urgent ? '#ffdbc8' : '#dae2fd';

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="h-1 w-full" style={{ background: color }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
            {sudahKumpul ? <CheckCircle size={16} style={{ color }} />
              : overdue ? <AlertCircle size={16} style={{ color }} />
              : <FileText size={16} style={{ color }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>Tugas</span>
                {t.mata_pelajaran && <span className="text-[10px] text-gray-400 ml-2">{t.mata_pelajaran.nama}</span>}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: bg, color }}>
                {sudahKumpul ? '✓ Dikumpulkan' : overdue ? 'Terlambat' : sisa || 'Aktif'}
              </span>
            </div>
            <p className="font-bold text-sm text-[#191c1e] mt-1 leading-snug">{t.judul}</p>
            {t.deskripsi && <p className="text-xs text-[#565e74] mt-1 line-clamp-2">{t.deskripsi}</p>}
            {deadline && (
              <div className="flex items-center gap-1 mt-2">
                <Clock size={10} style={{ color: overdue ? '#ef4444' : '#8b7265' }} />
                <span className="text-[10px]" style={{ color: overdue ? '#ef4444' : '#8b7265' }}>{fmtDeadline(t.deadline)}</span>
              </div>
            )}
            {sudahKumpul && t.submission_saya?.nilai != null && (
              <div className="mt-2 px-3 py-1.5 bg-[#ecfdf5] rounded-xl inline-flex items-center gap-2">
                <span className="text-xs text-emerald-700 font-semibold">Nilai: {t.submission_saya.nilai}</span>
                {t.submission_saya.catatan_guru && <span className="text-[10px] text-emerald-600">· {t.submission_saya.catatan_guru}</span>}
              </div>
            )}
            <div className="flex gap-2 mt-3 flex-wrap">
              {t.file_url && (
                <a href={`${API_BASE}${t.file_url}`} target="_blank" rel="noopener"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-[#f5f5f5] rounded-xl text-[#565e74]">
                  <Download size={11} /> Unduh Soal
                </a>
              )}
              {t.link_video && (
                <a href={t.link_video} target="_blank" rel="noopener"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-blue-50 rounded-xl text-blue-600">
                  <LinkIcon size={11} /> Link
                </a>
              )}
              {!sudahKumpul && !overdue && (
                <button onClick={onSubmit}
                  className="flex items-center gap-1 text-[11px] px-3 py-1 bg-[#1B8B87] text-white rounded-xl ml-auto font-semibold">
                  <Upload size={11} /> Kumpulkan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MateriCard({ m }: { m: any }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="h-1 w-full bg-emerald-400" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Materi</span>
              {m.mata_pelajaran && <span className="text-[10px] text-gray-400 ml-2">{m.mata_pelajaran.nama}</span>}
            </div>
            <p className="font-bold text-sm text-[#191c1e] mt-1 leading-snug">{m.judul}</p>
            {m.deskripsi && <p className="text-xs text-[#565e74] mt-1 line-clamp-2">{m.deskripsi}</p>}
            <div className="flex gap-2 mt-3 flex-wrap">
              {m.file_url && (
                <a href={`${API_BASE}${m.file_url}`} target="_blank" rel="noopener"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-[#f5f5f5] rounded-xl text-[#565e74]">
                  <Download size={11} /> {m.file_name || 'Unduh File'}
                </a>
              )}
              {m.link_video && (
                <a href={m.link_video} target="_blank" rel="noopener"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-blue-50 rounded-xl text-blue-600">
                  <LinkIcon size={11} /> Buka Link
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
