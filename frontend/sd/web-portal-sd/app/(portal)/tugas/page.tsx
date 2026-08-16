'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Upload, CheckCircle, Clock, FileText, X, AlertCircle, Bell, GraduationCap } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

function fmtDeadline(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function sisaHari(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  return `${diff} hari lagi`;
}

export default function TugasPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isSiswa = user?.role === 'siswa';
  const [selectedTugas, setSelectedTugas] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [catatan, setCatatan] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: siswaData } = useQuery({
    queryKey: ['portal-siswa-me'],
    queryFn: () => api.get('/siswa/me').then(r => r.data.data),
    enabled: isSiswa,
  });

  const kelasId = siswaData?.kelas_id;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-tugas', kelasId],
    queryFn: () => api.get('/tugas', { params: { kelas_id: kelasId } }).then(r => r.data),
    enabled: isSiswa && !!kelasId,
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (file) fd.append('file', file);
      if (catatan) fd.append('catatan_siswa', catatan);
      return api.post(`/tugas/${selectedTugas.id}/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-tugas'] });
      setSelectedTugas(null);
      setFile(null);
      setCatatan('');
    },
  });

  const tugasList: any[] = data?.data || [];
  const now = new Date();

  const belumSelesai = tugasList.filter(t => !t.submission_saya?.status && t.deadline && new Date(t.deadline) > now);
  const sudahSelesai = tugasList.filter(t => t.submission_saya?.status);
  const terlambat = tugasList.filter(t => !t.submission_saya?.status && t.deadline && new Date(t.deadline) <= now);

  const TugasCard = ({ t }: { t: any }) => {
    const deadline = t.deadline ? new Date(t.deadline) : null;
    const overdue = deadline && deadline < now;
    const sudahKumpul = t.submission_saya?.status;
    const sisa = deadline && !overdue ? sisaHari(t.deadline) : null;
    const urgent = sisa === 'Hari ini' || sisa === 'Besok';

    const accentColor = sudahKumpul ? '#059669' : overdue ? '#ef4444' : urgent ? '#f47b20' : '#3b5bdb';
    const accentBg = sudahKumpul ? '#ecfdf5' : overdue ? '#fef2f2' : urgent ? '#ffdbc8' : '#dae2fd';

    return (
      <div className="bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="h-1 w-full" style={{ background: accentColor }} />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: accentBg }}>
              {sudahKumpul
                ? <CheckCircle size={18} style={{ color: accentColor }} />
                : overdue
                ? <AlertCircle size={18} style={{ color: accentColor }} />
                : <ClipboardList size={18} style={{ color: accentColor }} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm text-[#191c1e] leading-snug">{t.judul}</p>
                <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: accentBg, color: accentColor }}>
                  {sudahKumpul ? '✓ Dikumpulkan' : overdue ? 'Terlambat' : sisa || 'Aktif'}
                </span>
              </div>

              <p className="text-[10px] text-[#8b7265] mt-0.5">
                {t.mata_pelajaran?.nama || 'Umum'} · {t.kelas?.nama}
              </p>

              {t.deskripsi && (
                <p className="text-xs text-[#565e74] mt-2 line-clamp-2">{t.deskripsi}</p>
              )}

              {deadline && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock size={10} style={{ color: overdue ? '#ef4444' : '#8b7265' }} />
                  <p className="text-[10px]" style={{ color: overdue ? '#ef4444' : '#8b7265' }}>
                    {fmtDeadline(t.deadline)}
                  </p>
                </div>
              )}

              {sudahKumpul && t.submission_saya?.nilai != null && (
                <div className="mt-2.5 flex items-center gap-2 bg-[#ecfdf5] rounded-xl px-3 py-2">
                  <span className="text-xs text-emerald-700 font-semibold">Nilai: {t.submission_saya.nilai}</span>
                  {t.submission_saya.catatan_guru && (
                    <span className="text-[10px] text-emerald-600">· {t.submission_saya.catatan_guru}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {t.file_url && (
              <a href={t.file_url} target="_blank" rel="noopener"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f5] rounded-xl text-xs font-semibold text-[#565e74]">
                <FileText size={12} /> Unduh Soal
              </a>
            )}
            {isSiswa && !sudahKumpul && !overdue && (
              <button onClick={() => setSelectedTugas(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f47b20] text-white rounded-xl text-xs font-semibold ml-auto">
                <Upload size={12} /> Kumpulkan
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e9e0d8] h-[60px] flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ffdbc8] flex items-center justify-center">
            <GraduationCap size={16} className="text-[#994700]" />
          </div>
          <div>
            <h1 className="font-black text-[#191c1e] text-base leading-none">Tugas</h1>
          </div>
        </div>
        <button className="w-9 h-9 rounded-full bg-[#ffdbc8]/50 flex items-center justify-center">
          <Bell size={18} className="text-[#994700]" />
        </button>
      </header>

      <div className="pt-[60px] pb-28">

        {/* Stats */}
        <div className="bg-white border-b border-[#e9e0d8] px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Aktif', count: belumSelesai.length, bg: '#ffdbc8', color: '#994700' },
              { label: 'Selesai', count: sudahSelesai.length, bg: '#ecfdf5', color: '#059669' },
              { label: 'Terlambat', count: terlambat.length, bg: '#fef2f2', color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 flex flex-col items-center" style={{ background: s.bg }}>
                <span className="font-black text-2xl leading-none" style={{ color: s.color }}>{s.count}</span>
                <span className="text-[10px] font-semibold mt-1" style={{ color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {isLoading || (isSiswa && !kelasId) ? (
            <div className="text-center py-16 text-[#8b7265] text-sm">Memuat tugas...</div>
          ) : tugasList.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)]">
              <div className="w-16 h-16 rounded-2xl bg-[#dae2fd] flex items-center justify-center mx-auto mb-4">
                <ClipboardList size={28} className="text-[#3b5bdb]" />
              </div>
              <p className="font-bold text-[#191c1e] text-sm">Belum ada tugas</p>
              <p className="text-xs text-[#8b7265] mt-1">Tugas dari guru akan muncul di sini</p>
            </div>
          ) : (
            <>
              {belumSelesai.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#565e74] uppercase tracking-widest mb-2 px-1">Perlu Dikumpulkan</p>
                  <div className="space-y-3">{belumSelesai.map(t => <TugasCard key={t.id} t={t} />)}</div>
                </div>
              )}
              {terlambat.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#565e74] uppercase tracking-widest mb-2 px-1">Terlambat</p>
                  <div className="space-y-3">{terlambat.map(t => <TugasCard key={t.id} t={t} />)}</div>
                </div>
              )}
              {sudahSelesai.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#565e74] uppercase tracking-widest mb-2 px-1">Sudah Dikumpulkan</p>
                  <div className="space-y-3">{sudahSelesai.map(t => <TugasCard key={t.id} t={t} />)}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Submit sheet */}
      {selectedTugas && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedTugas(null)} />
          <div className="relative bg-white rounded-t-3xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-[#e9e0d8] mx-auto mb-2" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#191c1e] text-base">Kumpulkan Tugas</p>
                <p className="text-xs text-[#8b7265]">{selectedTugas.judul}</p>
              </div>
              <button onClick={() => setSelectedTugas(null)} className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                <X size={16} className="text-[#565e74]" />
              </button>
            </div>

            <input ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3.5 border-2 border-dashed border-[#e9e0d8] rounded-2xl text-sm text-[#565e74] flex items-center justify-center gap-2 hover:border-[#f47b20] hover:text-[#f47b20] transition-colors">
              <Upload size={16} />
              {file ? file.name : 'Pilih file jawaban...'}
            </button>

            <div>
              <label className="block text-xs font-semibold text-[#565e74] mb-1.5">Catatan untuk guru (opsional)</label>
              <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={3}
                placeholder="Tulis catatan..."
                className="w-full px-3 py-2.5 border border-[#e9e0d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f47b20] resize-none" />
            </div>

            <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending || (!file && !catatan)}
              className="w-full py-3.5 bg-[#f47b20] text-white rounded-2xl font-bold text-sm disabled:opacity-50">
              {submitMut.isPending ? 'Mengumpulkan...' : 'Kumpulkan Tugas'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
