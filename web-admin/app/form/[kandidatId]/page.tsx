'use client';

import { useState, useEffect, use } from 'react';
import { GraduationCap, Star, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type Question = { id: string; label: string; type: 'text' | 'long_text' | 'choice' | 'rating'; options?: string[] };

const QUESTIONS_ORTU: Question[] = [
  { id: 'motivasi', label: 'Apa alasan utama Bapak/Ibu memilih SMP Islam Al Fakhir untuk putra/putri Anda?', type: 'long_text' },
  { id: 'harapan', label: 'Apa harapan terbesar Bapak/Ibu terhadap pendidikan putra/putri di sekolah ini?', type: 'long_text' },
  { id: 'karakter', label: 'Bagaimana karakter anak di rumah sehari-hari?', type: 'long_text' },
  { id: 'keterlibatan', label: 'Seberapa aktif Bapak/Ibu berencana terlibat dalam kegiatan sekolah?', type: 'choice', options: ['Sangat aktif', 'Cukup aktif', 'Tergantung waktu', 'Kurang bisa terlibat'] },
  { id: 'kondisi_khusus', label: 'Apakah ada kondisi kesehatan atau kebutuhan khusus yang perlu diketahui sekolah?', type: 'long_text' },
  { id: 'sumber_info', label: 'Dari mana Bapak/Ibu mengetahui SMP Islam Al Fakhir?', type: 'choice', options: ['Rekomendasi teman/keluarga', 'Media sosial', 'Website sekolah', 'Brosur/spanduk', 'Lainnya'] },
  { id: 'kesan', label: 'Seberapa baik kesan Bapak/Ibu terhadap proses pendaftaran ini?', type: 'rating' },
];

const QUESTIONS_SISWA: Question[] = [
  { id: 'alasan', label: 'Kenapa kamu ingin bersekolah di SMP Islam Al Fakhir?', type: 'long_text' },
  { id: 'hobi', label: 'Apa hobi atau kegiatan yang paling kamu sukai?', type: 'text' },
  { id: 'mapel_favorit', label: 'Mata pelajaran apa yang paling kamu sukai di sekolah sebelumnya?', type: 'text' },
  { id: 'cita_cita', label: 'Apa cita-cita atau impianmu ke depan?', type: 'text' },
  { id: 'pengalaman_organisasi', label: 'Apakah kamu pernah aktif di organisasi atau kegiatan ekstra? Ceritakan!', type: 'long_text' },
  { id: 'kekhawatiran', label: 'Apakah ada hal yang kamu khawatirkan tentang bersekolah di sini?', type: 'long_text' },
  { id: 'semangat', label: 'Seberapa semangat kamu mengikuti proses observasi ini?', type: 'rating' },
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110">
          <Star className={`w-9 h-9 ${n <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
        </button>
      ))}
    </div>
  );
}

export default function FormKandidatPage({ params, searchParams }: { params: Promise<{ kandidatId: string }>; searchParams: Promise<{ role?: string }> }) {
  const { kandidatId } = use(params);
  const { role } = use(searchParams);
  const isOrtu = role === 'ortu';
  const questions = isOrtu ? QUESTIONS_ORTU : QUESTIONS_SISWA;
  const roleLabel = isOrtu ? 'Orang Tua / Wali' : 'Siswa';

  const [kandidat, setKandidat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`${API}/kandidat/publik/${kandidatId}`).then(r => r.json()).then(d => {
      if (d.success) setKandidat(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));

    fetch(`${API}/jawaban-form/kandidat/${kandidatId}`).then(r => r.json()).then(d => {
      const existing = (d.data || []).find((j: any) => j.role === role);
      if (existing) setDone(true);
    }).catch(() => {});
  }, [kandidatId, role]);

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;
  const answered = Object.keys(answers).length;

  const setAnswer = (val: string | number) => setAnswers(prev => ({ ...prev, [q.id]: val }));

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true); setErr('');
    try {
      const res = await fetch(`${API}/jawaban-form/kandidat/${kandidatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, jawaban: answers }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setErr(data.message || 'Gagal mengirim');
    } catch { setErr('Koneksi gagal. Coba lagi.'); }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white rounded-[40px] p-10 shadow-2xl text-center max-w-md w-full">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Formulir Terkirim!</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Terima kasih, <strong>{kandidat?.nama_diperbaiki || kandidat?.nama}</strong>! Jawaban untuk <strong>{roleLabel}</strong> sudah kami terima.
        </p>
        <a href="/form" className="inline-block text-sm text-[#1B8B87] font-bold hover:underline">← Kembali ke portal</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#1B8B87]" />
            </div>
            <div>
              <p className="font-black text-sm text-slate-900 leading-none">Formulir {roleLabel}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kandidat?.nama_diperbaiki || kandidat?.nama}</p>
            </div>
          </div>
          <span className="text-xs font-black text-slate-400">{current + 1} / {questions.length}</span>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-[#1B8B87] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 pb-32">
        <div className="space-y-8">
          {/* Question */}
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Pertanyaan {current + 1}</p>
            <h2 className="text-2xl font-black text-slate-900 leading-snug">{q.label}</h2>
          </div>

          {/* Answer input */}
          <div>
            {q.type === 'text' && (
              <input type="text" placeholder="Tulis jawaban Anda..."
                value={(answers[q.id] as string) || ''}
                onChange={e => setAnswer(e.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-white border-2 border-slate-100 focus:border-[#1B8B87] outline-none transition-all font-bold text-slate-800 shadow-sm" />
            )}
            {q.type === 'long_text' && (
              <textarea placeholder="Tulis jawaban Anda..."
                value={(answers[q.id] as string) || ''}
                onChange={e => setAnswer(e.target.value)}
                rows={5}
                className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-[#1B8B87] outline-none transition-all font-bold text-slate-800 shadow-sm resize-none" />
            )}
            {q.type === 'choice' && q.options && (
              <div className="space-y-3">
                {q.options.map(opt => (
                  <button key={opt} onClick={() => setAnswer(opt)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${answers[q.id] === opt ? 'border-[#1B8B87] bg-teal-50 text-[#1B8B87]' : 'border-slate-100 bg-white hover:border-slate-300 text-slate-700 shadow-sm'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {q.type === 'rating' && (
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-100 shadow-sm">
                <StarRating value={(answers[q.id] as number) || 0} onChange={setAnswer} />
                {answers[q.id] ? (
                  <p className="text-sm text-slate-500 mt-3 font-bold">{['', 'Sangat kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'][answers[q.id] as number]}</p>
                ) : <p className="text-sm text-slate-300 mt-3">Pilih bintang...</p>}
              </div>
            )}
          </div>

          {err && <p className="text-red-500 text-sm font-bold">{err}</p>}

          {/* Nav */}
          <div className="flex items-center justify-between pt-4">
            <button onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0}
              className="h-12 px-6 rounded-2xl font-bold text-sm flex items-center gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>

            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent(p => p + 1)} disabled={!answers[q.id]}
                className={`h-12 px-8 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 ${answers[q.id] ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit}
                disabled={submitting || answered < questions.length}
                className={`h-12 px-8 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 ${answered >= questions.length ? 'bg-[#1B8B87] hover:bg-teal-600 text-white shadow-xl shadow-teal-500/20' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                {submitting ? 'Mengirim...' : 'Kirim Formulir'}
              </button>
            )}
          </div>
        </div>

        {/* Dot progress */}
        <div className="flex justify-center gap-1.5 mt-12">
          {questions.map((_, idx) => (
            <div key={idx} className={`rounded-full transition-all ${idx === current ? 'w-6 h-2 bg-[#1B8B87]' : answers[questions[idx].id] ? 'w-2 h-2 bg-emerald-400' : 'w-2 h-2 bg-slate-200'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
