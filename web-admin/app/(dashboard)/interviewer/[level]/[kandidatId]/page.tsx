'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, CheckCircle2, GraduationCap, FileText, MessageSquare } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const TABS = ['Info & Form', 'Tes Akademik', 'Catatan'] as const;
type Tab = typeof TABS[number];

const REKOMENDASI = [
  { value: 'Terima', label: 'Terima', cls: 'bg-emerald-500 text-white', activeCls: 'ring-2 ring-emerald-400' },
  { value: 'Pertimbangkan', label: 'Pertimbangkan', cls: 'bg-amber-400 text-white', activeCls: 'ring-2 ring-amber-300' },
  { value: 'Tolak', label: 'Tolak', cls: 'bg-red-500 text-white', activeCls: 'ring-2 ring-red-400' },
];

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600',
  REVIEW: 'bg-blue-50 text-blue-600',
  DITERIMA: 'bg-emerald-50 text-emerald-600',
  DITOLAK: 'bg-red-50 text-red-600',
};
const STATUS_LABEL: Record<string, string> = { PENDING: 'Menunggu', REVIEW: 'Wawancara', DITERIMA: 'Diterima', DITOLAK: 'Ditolak' };

const ta = "w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-teal-400 bg-gray-50 min-h-[80px]";

function getPredikat(skor: number) {
  if (skor >= 86) return { grade: 'A', desc: 'Sangat Baik', color: 'text-emerald-600' };
  if (skor >= 71) return { grade: 'B', desc: 'Baik', color: 'text-blue-600' };
  if (skor >= 56) return { grade: 'C', desc: 'Cukup', color: 'text-amber-600' };
  return { grade: 'D', desc: 'Kurang', color: 'text-red-600' };
}

const QUESTION_LABELS: Record<string, string> = {
  motivasi: 'Motivasi',
  harapan: 'Harapan',
  prestasi: 'Prestasi',
  kendala: 'Kendala/Tantangan',
  dukungan: 'Dukungan Keluarga',
  kegiatan: 'Kegiatan Sehari-hari',
  lainnya: 'Lain-lain',
};

export default function KandidatDetailPage({ params }: { params: Promise<{ level: string; kandidatId: string }> }) {
  const { level, kandidatId } = use(params);
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('Info & Form');

  const { data, isLoading } = useQuery({
    queryKey: ['kandidat-detail', kandidatId],
    queryFn: () => api.get(`/kandidat/${kandidatId}`).then(r => r.data.data),
  });

  const k = data;
  const existingCatatan = k?.catatan_list?.[0] || null;
  const isLocked = existingCatatan?.is_locked && (user as any)?.role !== 'admin';

  const emptyForm = {
    pewawancara_nama: user?.nama || '',
    pewawancara_email: user?.email || '',
    observasi: '', penilaian_akademik: '', dukungan_keluarga: '',
    catatan_karakter: '', catatan_lain: '', rekomendasi: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [initialized, setInitialized] = useState(false);

  if (existingCatatan && !initialized) {
    setForm({
      pewawancara_nama: existingCatatan.pewawancara_nama || user?.nama || '',
      pewawancara_email: existingCatatan.pewawancara_email || user?.email || '',
      observasi: existingCatatan.observasi || '',
      penilaian_akademik: existingCatatan.penilaian_akademik || '',
      dukungan_keluarga: existingCatatan.dukungan_keluarga || '',
      catatan_karakter: existingCatatan.catatan_karakter || '',
      catatan_lain: existingCatatan.catatan_lain || '',
      rekomendasi: existingCatatan.rekomendasi || '',
    });
    setInitialized(true);
  }

  const saveMut = useMutation({
    mutationFn: () => existingCatatan
      ? api.put(`/catatan-pewawancara/${existingCatatan.id}`, form)
      : api.post(`/catatan-pewawancara/kandidat/${kandidatId}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kandidat-detail', kandidatId] });
      setInitialized(false);
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
    </div>
  );

  if (!k) return (
    <div className="text-center py-20 text-gray-400">Kandidat tidak ditemukan.</div>
  );

  const nama = k.nama_diperbaiki || k.nama;
  const hasil = k.hasil_tes;
  const jawabanOrtu = k.jawaban_form_list?.find((j: any) => j.role === 'ortu');
  const jawabanSiswa = k.jawaban_form_list?.find((j: any) => j.role === 'siswa');

  let skorPerMapel: Record<string, { correct: number; total: number }> = {};
  if (hasil?.skor_per_mapel) {
    try { skorPerMapel = JSON.parse(hasil.skor_per_mapel); } catch {}
  }

  const catatanFields: [keyof typeof form, string][] = [
    ['observasi', 'Observasi Umum'],
    ['penilaian_akademik', 'Penilaian Akademik'],
    ['dukungan_keluarga', 'Dukungan Keluarga'],
    ['catatan_karakter', 'Catatan Karakter'],
    ['catatan_lain', 'Catatan Lain'],
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.push(`/interviewer/${level}`)}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0 mt-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900">{nama}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLOR[k.status]}`}>
              {STATUS_LABEL[k.status]}
            </span>
            <span className="text-xs text-gray-400 font-medium">{k.level}</span>
            {k.ruangan && <span className="text-xs text-gray-400 font-medium">· Ruang {k.ruangan}</span>}
            {k.tahun_ajaran && <span className="text-xs text-gray-400 font-medium">· {k.tahun_ajaran}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-white shadow-sm text-slate-800' : 'text-gray-400 hover:text-gray-600'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Info & Form */}
      {tab === 'Info & Form' && (
        <div className="space-y-4">
          {/* Info dasar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Data Kandidat</h3>
            {[
              ['Nama Orang Tua', k.nama_ortu],
              ['No. Telp Ortu', k.no_telp_ortu],
              ['Email Ortu', k.email_ortu],
              ['Email Siswa', k.email_siswa],
              ['Asal Sekolah', k.asal_sekolah],
              ['Tanggal Lahir', k.tanggal_lahir ? new Date(k.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null],
              ['Jenis Kelamin', k.jenis_kelamin],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string} className="flex gap-3">
                <span className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-slate-700 font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Jawaban form ortu */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={14} /> Jawaban Orang Tua
            </h3>
            {jawabanOrtu ? (
              <div className="space-y-3">
                {Object.entries(jawabanOrtu.jawaban || {}).map(([key, val]) => (
                  <div key={key} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <p className="text-xs font-bold text-gray-400 mb-1">{QUESTION_LABELS[key] || key}</p>
                    <p className="text-sm text-slate-700">{String(val)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Belum mengisi form.</p>
            )}
          </div>

          {/* Jawaban form siswa */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={14} /> Jawaban Siswa
            </h3>
            {jawabanSiswa ? (
              <div className="space-y-3">
                {Object.entries(jawabanSiswa.jawaban || {}).map(([key, val]) => (
                  <div key={key} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <p className="text-xs font-bold text-gray-400 mb-1">{QUESTION_LABELS[key] || key}</p>
                    <p className="text-sm text-slate-700">{String(val)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Belum mengisi form.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Tes Akademik */}
      {tab === 'Tes Akademik' && (
        <div className="space-y-4">
          {hasil ? (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Skor Total</p>
                <p className="text-6xl font-black text-[#1B8B87]">{Math.round(hasil.total_skor)}</p>
                {(() => {
                  const p = getPredikat(hasil.total_skor);
                  return (
                    <p className={`text-lg font-black mt-1 ${p.color}`}>
                      Predikat {p.grade} — {p.desc}
                    </p>
                  );
                })()}
              </div>

              {Object.keys(skorPerMapel).length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Nilai Per Mapel</h3>
                  {Object.entries(skorPerMapel).map(([mapel, data]) => {
                    const skor = Math.round((data.correct / data.total) * 100);
                    const p = getPredikat(skor);
                    return (
                      <div key={mapel}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-bold text-slate-700">{mapel}</span>
                          <span className={`text-sm font-black ${p.color}`}>{skor} <span className="text-xs text-gray-400">({data.correct}/{data.total})</span></span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${skor}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
              <GraduationCap className="mx-auto text-gray-200 mb-3" size={40} />
              <p className="text-gray-400 font-medium">Belum mengerjakan tes akademik.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Catatan */}
      {tab === 'Catatan' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14} /> Catatan Wawancara
            </h3>
            {existingCatatan && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isLocked ? 'bg-gray-100 text-gray-500' : 'bg-teal-50 text-teal-600'}`}>
                {isLocked ? <><Lock size={11} /> Dikunci</> : <><CheckCircle2 size={11} /> Tersimpan</>}
              </span>
            )}
          </div>

          {isLocked ? (
            <div className="space-y-3 opacity-75 pointer-events-none">
              {catatanFields.map(([field, label]) => (
                form[field] ? (
                  <div key={field} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <p className="text-xs font-bold text-gray-400 mb-1">{label}</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{form[field]}</p>
                  </div>
                ) : null
              ))}
              {form.rekomendasi && (
                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                  <p className="text-xs font-bold text-gray-400 mb-1">Rekomendasi</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                    form.rekomendasi === 'Terima' ? 'bg-emerald-100 text-emerald-700' :
                    form.rekomendasi === 'Tolak' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{form.rekomendasi}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {catatanFields.map(([field, label]) => (
                <div key={field}>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
                  <textarea className={ta}
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Rekomendasi</label>
                <div className="flex gap-2">
                  {REKOMENDASI.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setForm(f => ({ ...f, rekomendasi: f.rekomendasi === r.value ? '' : r.value }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${r.cls} ${form.rekomendasi === r.value ? r.activeCls + ' scale-105' : 'opacity-50 hover:opacity-80'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                className="w-full py-3 bg-[#1B8B87] hover:bg-teal-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50">
                {saveMut.isPending ? 'Menyimpan...' : existingCatatan ? 'Perbarui Catatan' : 'Simpan Catatan'}
              </button>
              {saveMut.isSuccess && (
                <p className="text-center text-xs text-emerald-600 font-bold">Catatan berhasil disimpan!</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
