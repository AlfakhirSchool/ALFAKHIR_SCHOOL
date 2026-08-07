'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FileText, CheckCircle, Clock, Users } from 'lucide-react';
import { api } from '@/lib/api';

const fmt = (d: string) =>
  new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function TugasDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [nilai, setNilai] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: tugas } = useQuery({
    queryKey: ['tugas-detail', id],
    queryFn: () => api.get(`/tugas/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => api.get(`/tugas/${id}/submissions`).then(r => r.data.data),
    enabled: !!id,
  });

  const nilaiMutation = useMutation({
    mutationFn: ({ submId, val, cat }: { submId: string; val: string; cat: string }) =>
      api.put(`/tugas/submissions/${submId}/nilai`, { nilai: parseInt(val), catatan_guru: cat || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions', id] });
      setSaving(null);
    },
    onError: (e: any) => {
      alert(e?.response?.data?.message ?? 'Gagal menyimpan nilai');
      setSaving(null);
    },
  });

  const handleSaveNilai = (submId: string) => {
    const val = nilai[submId];
    if (!val) return alert('Masukkan nilai terlebih dahulu');
    setSaving(submId);
    nilaiMutation.mutate({ submId, val, cat: catatan[submId] ?? '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B8B87] text-white px-5 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="font-semibold text-base leading-tight">{tugas?.judul ?? 'Tugas'}</p>
          <p className="text-xs text-white/70">Submission Siswa</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {tugas && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Clock size={15} /> Deadline: {fmt(tugas.deadline)}
            </div>
            {tugas.deskripsi && <p className="text-sm text-gray-600">{tugas.deskripsi}</p>}
            {tugas.file_url && (
              <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${tugas.file_url}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-teal-600 underline">
                <FileText size={13} /> {tugas.file_name ?? 'Lampiran'}
              </a>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          <Users size={16} /> {submissions.length} submission masuk
        </div>

        {isLoading && <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>}

        {!isLoading && submissions.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            Belum ada siswa yang mengumpulkan tugas ini.
          </div>
        )}

        {submissions.map((s: any) => {
          const siswaName = s.siswa?.user?.nama ?? s.siswa?.nis ?? 'Siswa';
          const sudahDinilai = s.nilai != null;
          const nilaiVal = nilai[s.id] ?? (sudahDinilai ? String(s.nilai) : '');
          const catatanVal = catatan[s.id] ?? (s.catatan_guru ?? '');

          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{siswaName}</p>
                  {s.siswa?.nis && <p className="text-xs text-gray-400">NIS: {s.siswa.nis}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Dikumpulkan: {fmt(s.created_at)}
                  </p>
                </div>
                {sudahDinilai && (
                  <span className="flex items-center gap-1 text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
                    <CheckCircle size={12} /> Nilai: {s.nilai}/{tugas?.max_nilai ?? 100}
                  </span>
                )}
              </div>

              {s.catatan_siswa && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  "{s.catatan_siswa}"
                </p>
              )}

              {s.file_url && (
                <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${s.file_url}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-teal-600 underline">
                  <FileText size={13} /> {s.file_name ?? 'File Jawaban'}
                </a>
              )}

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number" min={0} max={tugas?.max_nilai ?? 100}
                    placeholder={`Nilai (max ${tugas?.max_nilai ?? 100})`}
                    value={nilaiVal}
                    onChange={e => setNilai(p => ({ ...p, [s.id]: e.target.value }))}
                    className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <input
                    type="text"
                    placeholder="Catatan guru (opsional)"
                    value={catatanVal}
                    onChange={e => setCatatan(p => ({ ...p, [s.id]: e.target.value }))}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    onClick={() => handleSaveNilai(s.id)}
                    disabled={saving === s.id}
                    className="px-4 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
                    {saving === s.id ? '...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
