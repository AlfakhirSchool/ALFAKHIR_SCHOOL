'use client';

import { useState, useEffect, use } from 'react';
import { GraduationCap, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, User } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type Soal = { id: string; teks: string; mata_pelajaran: string; gambar_url: string | null; pilihan: string; urutan: number };
type ParsedSoal = Soal & { pilihanParsed: { key: string; text: string }[] };

const MAPEL_COLOR: Record<string, string> = {
  'Matematika': 'bg-blue-50 text-blue-600 border-blue-100',
  'Bahasa Indonesia': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Bahasa Inggris': 'bg-purple-50 text-purple-600 border-purple-100',
};

export default function TesKandidatPage({ params }: { params: Promise<{ kandidatId: string }> }) {
  const { kandidatId } = use(params);
  const [kandidat, setKandidat] = useState<any>(null);
  const [soalList, setSoalList] = useState<ParsedSoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [hasil, setHasil] = useState<{ total_skor: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/kandidat/publik/${kandidatId}`).then((r: any) => r.json()),
    ]).then(async ([kData]) => {
      if (!kData.success) { setError('Kandidat tidak ditemukan.'); setLoading(false); return; }
      const k = kData.data;
      setKandidat(k);

      // Cek apakah sudah mengerjakan
      if (k.hasil_tes) { setDone(true); setHasil(k.hasil_tes); setLoading(false); return; }

      // Fetch soal
      const soalRes = await fetch(`${API}/soal-akademik/publik?level=${k.level}`);
      const soalData = await soalRes.json();
      const parsed: ParsedSoal[] = (soalData.data || []).map((s: Soal) => {
        let pilihanParsed: { key: string; text: string }[] = [];
        try { pilihanParsed = JSON.parse(s.pilihan); } catch {}
        return { ...s, pilihanParsed };
      });
      setSoalList(parsed);
      setLoading(false);
    }).catch(() => { setError('Gagal memuat data.'); setLoading(false); });
  }, [kandidatId]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/soal-akademik/kandidat/${kandidatId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jawaban: answers }),
      });
      const data = await res.json();
      if (data.success) { setDone(true); setHasil(data.data); }
      else { alert(data.message || 'Gagal submit'); setSubmitting(false); }
    } catch { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Menyiapkan Materi...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="font-bold text-slate-700">{error}</p>
        <a href="/tes" className="mt-4 inline-block text-teal-600 hover:underline text-sm">← Kembali ke portal</a>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[40px] p-10 shadow-2xl text-center max-w-md w-full">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Tes Selesai!</h2>
        <p className="text-slate-500 mb-6">Jawaban sudah berhasil dikirim.</p>
        {hasil && (
          <div className="bg-teal-50 rounded-3xl p-6 mb-6">
            <p className="text-sm text-teal-600 font-bold uppercase tracking-widest mb-1">Skor Anda</p>
            <p className="text-5xl font-black text-[#1B8B87]">{Math.round(hasil.total_skor)}</p>
            <p className="text-xs text-teal-400 mt-1">dari 100</p>
          </div>
        )}
        <a href="/tes" className="text-sm text-slate-400 hover:text-slate-600">← Kembali ke portal</a>
      </div>
    </div>
  );

  if (soalList.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-4xl mb-4">📝</p>
        <p className="font-bold text-slate-700">Belum ada soal untuk jenjang {kandidat?.level}.</p>
        <a href="/tes" className="mt-4 inline-block text-teal-600 hover:underline text-sm">← Kembali</a>
      </div>
    </div>
  );

  const currentSoal = soalList[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = ((currentIndex + 1) / soalList.length) * 100;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
              <GraduationCap className="text-[#1B8B87] h-6 w-6" />
            </div>
            <div>
              <h1 className="text-slate-900 font-black text-base leading-tight uppercase tracking-tight">Tes Akademik</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <User size={12} className="text-slate-400" />
                <p className="text-slate-500 text-xs font-bold">{kandidat?.nama_diperbaiki || kandidat?.nama}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Progress</span>
              <span className={`text-sm font-black italic ${answeredCount === soalList.length ? 'text-emerald-500' : 'text-[#1B8B87]'}`}>
                {answeredCount} / {soalList.length}
              </span>
            </div>
            <button onClick={handleSubmit}
              disabled={submitting || answeredCount < soalList.length}
              className={`font-black uppercase tracking-widest text-xs h-11 px-6 rounded-2xl transition-all active:scale-95 ${answeredCount === soalList.length ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              {submitting ? 'Mengirim...' : 'Selesai & Kirim'}
            </button>
          </div>
        </header>
        <div className="h-[3px] bg-slate-100 w-full overflow-hidden">
          <div className="h-full bg-[#1B8B87] transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-6 pt-12 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Question */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-full border shadow-sm ${MAPEL_COLOR[currentSoal.mata_pelajaran] || 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                  {currentSoal.mata_pelajaran}
                </span>
                <span className="text-slate-400 text-xs font-bold">Soal {currentIndex + 1}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{currentSoal.teks}</h2>
              {currentSoal.gambar_url && (
                <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 overflow-hidden max-w-lg">
                  <img src={currentSoal.gambar_url} alt="Gambar soal" className="max-w-full h-auto rounded-2xl" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {currentSoal.pilihanParsed.map((p, idx) => (
                <button key={p.key} onClick={() => setAnswers(prev => ({ ...prev, [currentSoal.id]: p.key }))}
                  className={`w-full text-left p-5 rounded-3xl border-2 transition-all flex items-center gap-5 group ${answers[currentSoal.id] === p.key ? 'bg-teal-50 border-[#1B8B87] shadow-lg shadow-teal-500/10' : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0 transition-all ${answers[currentSoal.id] === p.key ? 'bg-[#1B8B87] text-white scale-110' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                    {p.key}
                  </div>
                  <span className="text-base font-bold leading-relaxed">{p.text}</span>
                  {answers[currentSoal.id] === p.key && (
                    <CheckCircle2 className="ml-auto w-5 h-5 text-[#1B8B87]" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-slate-200">
              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentIndex(p => Math.max(0, p - 1)); }}
                disabled={currentIndex === 0}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-14 px-8 rounded-2xl font-bold flex items-center gap-2 disabled:opacity-40 transition-all">
                <ChevronLeft className="h-5 w-5" /> Kembali
              </button>
              <button onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (currentIndex < soalList.length - 1) setCurrentIndex(p => p + 1);
                else handleSubmit();
              }}
                disabled={currentIndex === soalList.length - 1 && (submitting || answeredCount < soalList.length)}
                className={`h-14 px-10 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 ${currentIndex === soalList.length - 1 ? (answeredCount === soalList.length ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed') : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10'}`}>
                {currentIndex === soalList.length - 1 ? 'Selesai & Kirim' : 'Soal Berikutnya'}
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 sticky top-32 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Navigasi Soal</h3>
              <div className="grid grid-cols-5 gap-2">
                {soalList.map((s, idx) => (
                  <button key={s.id} onClick={() => setCurrentIndex(idx)}
                    className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all border ${currentIndex === idx ? 'bg-[#1B8B87] text-white border-[#1B8B87] shadow-lg scale-110 z-10' : answers[s.id] ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                <div className="flex justify-between text-xs font-black px-1">
                  <span className="text-slate-400 uppercase tracking-widest">Terjawab</span>
                  <span className="text-[#1B8B87] italic">{answeredCount} / {soalList.length}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1B8B87] transition-all duration-700" style={{ width: `${(answeredCount / soalList.length) * 100}%` }} />
                </div>
                {answeredCount < soalList.length ? (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                    <AlertCircle className="text-amber-500 h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-bold leading-relaxed italic">
                      Masih {soalList.length - answeredCount} soal belum diisi.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 font-black leading-relaxed italic uppercase tracking-tight">
                      Semua soal terisi! Kirim sekarang.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
