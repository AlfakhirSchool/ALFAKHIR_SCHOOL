'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Upload, CheckCircle, Clock, FileText, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function TugasPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isSiswa = user?.role === 'siswa';
  const [selectedTugas, setSelectedTugas] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [catatan, setCatatan] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['portal-tugas'],
    queryFn: () => api.get('/tugas').then(r => r.data),
  });

  const tugasList: any[] = data?.data || [];

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

  const now = new Date();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">Tugas & Materi</h1>

      {isLoading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Memuat...</div>
      ) : tugasList.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada tugas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tugasList.map((t: any) => {
            const deadline = t.deadline ? new Date(t.deadline) : null;
            const overdue = deadline && deadline < now;
            const sudahKumpul = t.submission_saya?.status;

            return (
              <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{t.judul}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.kelas?.nama} · {t.mata_pelajaran?.nama || 'Umum'}</p>
                      {t.deskripsi && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{t.deskripsi}</p>}
                    </div>
                    {sudahKumpul ? (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium whitespace-nowrap">
                        <CheckCircle size={10} /> Dikumpulkan
                      </span>
                    ) : overdue ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium whitespace-nowrap">
                        Terlambat
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 font-medium whitespace-nowrap">
                        <Clock size={10} /> Belum
                      </span>
                    )}
                  </div>

                  {deadline && (
                    <p className={`text-[10px] mt-2 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                      Deadline: {deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {/* File tugas dari guru */}
                  {t.file_url && (
                    <a href={t.file_url} target="_blank" rel="noopener"
                      className="mt-3 flex items-center gap-2 text-xs text-[#1A6B3C] font-medium">
                      <FileText size={14} /> Unduh Materi/Soal
                    </a>
                  )}

                  {/* Nilai jika sudah dinilai */}
                  {sudahKumpul && t.submission_saya?.nilai !== null && (
                    <div className="mt-3 p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-700">
                        Nilai: <strong>{t.submission_saya.nilai}</strong>
                        {t.submission_saya.catatan_guru && ` · ${t.submission_saya.catatan_guru}`}
                      </p>
                    </div>
                  )}

                  {/* Tombol kumpul */}
                  {isSiswa && !sudahKumpul && !overdue && (
                    <button
                      onClick={() => setSelectedTugas(t)}
                      className="mt-3 w-full py-2 bg-[#1A6B3C] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-[#145730] transition-colors"
                    >
                      <Upload size={13} /> Kumpulkan Tugas
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal kumpul tugas */}
      {selectedTugas && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">{selectedTugas.judul}</p>
              <button onClick={() => setSelectedTugas(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Upload File Jawaban</label>
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#1A6B3C] file:text-white file:text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan (opsional)</label>
              <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={3}
                placeholder="Tulis catatan untuk guru..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B3C] resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending || (!file && !catatan)}
                className="flex-1 py-2.5 bg-[#1A6B3C] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {submitMut.isPending ? 'Mengumpulkan...' : 'Kumpulkan'}
              </button>
              <button onClick={() => setSelectedTugas(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
