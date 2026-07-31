'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Lock, CheckCircle2, GraduationCap, FileText, MessageSquare,
  Sparkles, QrCode, Download, RefreshCw, X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const TABS = ['Info & Form', 'Tes Akademik', 'Catatan'] as const;
type Tab = typeof TABS[number];

const REKOMENDASI = [
  { value: 'Terima',        label: '✅ Terima',         cls: 'bg-emerald-500', activeCls: 'ring-4 ring-emerald-300 scale-105' },
  { value: 'Pertimbangkan', label: '⚠️ Pertimbangkan',  cls: 'bg-amber-400',   activeCls: 'ring-4 ring-amber-200 scale-105' },
  { value: 'Tolak',         label: '❌ Tolak',           cls: 'bg-red-500',     activeCls: 'ring-4 ring-red-300 scale-105' },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Menunggu' },
  REVIEW:   { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Wawancara' },
  DITERIMA: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Diterima' },
  DITOLAK:  { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Ditolak' },
};

const ta = "w-full border-2 border-slate-100 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:border-teal-400 bg-slate-50 min-h-[90px] font-medium transition-colors";

function QrCanvas({ url, size = 200 }: { url: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!url || !ref.current) return;
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(ref.current!, url, { width: size, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    });
  }, [url, size]);
  return <canvas ref={ref} width={size} height={size} />;
}

function getPredikat(skor: number) {
  if (skor >= 86) return { grade: 'A', desc: 'Sangat Baik', color: 'text-emerald-600', bar: 'bg-emerald-500' };
  if (skor >= 71) return { grade: 'B', desc: 'Baik',        color: 'text-blue-600',    bar: 'bg-blue-500' };
  if (skor >= 56) return { grade: 'C', desc: 'Cukup',       color: 'text-amber-600',   bar: 'bg-amber-500' };
  return             { grade: 'D', desc: 'Kurang',      color: 'text-red-600',     bar: 'bg-red-500' };
}

// Simple markdown renderer
function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<h3 class="font-black text-slate-800 text-base mt-4 mb-1">$1</h3>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-600 text-sm">• $1</li>')
    .replace(/(\d+)%/g, '<span class="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-lg font-bold text-xs">$1%</span>')
    .replace(/\n/g, '<br/>');
}

export default function KandidatDetailPage({ params }: { params: Promise<{ level: string; kandidatId: string }> }) {
  const { level, kandidatId } = use(params);
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('Info & Form');
  const [showQr, setShowQr] = useState(false);
  const [showQrTes, setShowQrTes] = useState(false);
  const [origin, setOrigin] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

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

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const res = await api.post(`/kandidat/${kandidatId}/generate-ai`);
      setAiSummary(res.data.data?.ringkasan_ai || '');
    } catch {}
    setAiLoading(false);
  };

  const exportExcel = async () => {
    if (!k?.hasil_tes) return;
    const { default: XLSX } = await import('xlsx');
    const hasil = k.hasil_tes;
    let subjects: any[] = [];
    if (hasil.skor_per_mapel) {
      try {
        const parsed = JSON.parse(hasil.skor_per_mapel);
        subjects = Object.entries(parsed).map(([name, data]: [string, any]) => {
          const skor = Math.round((data.correct / data.total) * 100);
          const p = getPredikat(skor);
          return { 'Mata Pelajaran': name, 'Benar': data.correct, 'Total': data.total, 'Nilai': skor, 'Predikat': p.grade, 'Keterangan': p.desc };
        });
      } catch {}
    }
    const nama = k.nama_diperbaiki || k.nama;
    const p = getPredikat(hasil.total_skor);
    const ringkasan = [{ 'Nama': nama, 'Level': k.level, 'Nilai Akhir': Math.round(hasil.total_skor), 'Predikat': p.grade, 'Keterangan': p.desc }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), 'Ringkasan');
    if (subjects.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subjects), 'Per Mapel');
    XLSX.writeFile(wb, `Nilai_${nama.replace(/\s+/g, '_')}.xlsx`);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
    </div>
  );

  if (!k) return (
    <div className="flex flex-col items-center py-20 gap-3 text-slate-400">
      <div className="w-20 h-20 rounded-[28px] bg-slate-100 flex items-center justify-center">
        <FileText size={32} className="text-slate-300" />
      </div>
      <p className="font-black uppercase tracking-widest text-sm">Kandidat tidak ditemukan</p>
    </div>
  );

  const nama = k.nama_diperbaiki || k.nama;
  const hasil = k.hasil_tes;
  const jawabanOrtu = k.jawaban_form_list?.find((j: any) => j.role === 'ortu');
  const jawabanSiswa = k.jawaban_form_list?.find((j: any) => j.role === 'siswa');
  const formUrl = `${origin}/form/${kandidatId}`;
  const tesUrl  = `${origin}/tes/${kandidatId}`;

  let skorPerMapel: Record<string, { correct: number; total: number }> = {};
  if (hasil?.skor_per_mapel) {
    try { skorPerMapel = JSON.parse(hasil.skor_per_mapel); } catch {}
  }

  const catatanFields: [keyof typeof form, string][] = [
    ['observasi',          'Observasi Umum'],
    ['penilaian_akademik', 'Penilaian Akademik'],
    ['dukungan_keluarga',  'Dukungan Keluarga'],
    ['catatan_karakter',   'Catatan Karakter'],
    ['catatan_lain',       'Catatan Lain'],
  ];

  const st = STATUS_CONFIG[k.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="flex flex-col gap-6 pb-16 animate-in fade-in duration-500">

      {/* QR Modal */}
      {showQr && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowQr(false)}>
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-900 italic uppercase tracking-tight">QR Code Form</h3>
              <button onClick={() => setShowQr(false)} className="p-2 rounded-xl hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl">
                <QrCanvas url={formUrl} size={200} />
              </div>
              <p className="text-xs text-slate-400 text-center break-all">{formUrl}</p>
              <button
                onClick={() => navigator.clipboard?.writeText(formUrl)}
                className="w-full py-3 bg-teal-500 text-white rounded-2xl text-sm font-black hover:bg-teal-600 transition-colors">
                Salin Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal Tes Akademik */}
      {showQrTes && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowQrTes(false)}>
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-900 italic uppercase tracking-tight">QR Tes Akademik</h3>
              <button onClick={() => setShowQrTes(false)} className="p-2 rounded-xl hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl">
                <QrCanvas url={tesUrl} size={200} />
              </div>
              <p className="text-xs text-slate-400 text-center break-all">{tesUrl}</p>
              <button
                onClick={() => navigator.clipboard?.writeText(tesUrl)}
                className="w-full py-3 bg-teal-500 text-white rounded-2xl text-sm font-black hover:bg-teal-600 transition-colors">
                Salin Link Tes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.push(`/interviewer/${level}`)}
          className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0 mt-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${st.bg} ${st.text}`}>
              {st.label}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k.level}</span>
            {k.ruangan && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">· Ruang {k.ruangan}</span>}
          </div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tight">{nama}</h1>
          {k.nama_ortu && <p className="text-sm text-slate-400 font-medium mt-0.5">Orang tua: {k.nama_ortu}</p>}
          <div className="h-1 w-16 bg-teal-500 rounded-full mt-2" />
        </div>
        <div className="flex gap-2 mt-1">
          <button onClick={() => setShowQr(true)}
            className="p-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-teal-400 text-slate-500 hover:text-teal-600 transition-all shadow-sm"
            title="QR Code Form Pendaftaran">
            <QrCode size={18} />
          </button>
          {!hasil && (
            <button onClick={() => setShowQrTes(true)}
              className="p-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
              title="QR Tes Akademik">
              <GraduationCap size={18} />
            </button>
          )}
          {hasil && (
            <button onClick={exportExcel}
              className="p-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-emerald-400 text-slate-500 hover:text-emerald-600 transition-all shadow-sm"
              title="Export Excel">
              <Download size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-black transition-all uppercase tracking-wide ${
              tab === t ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Info & Form */}
      {tab === 'Info & Form' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[28px] border-2 border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Kandidat</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['Nama Orang Tua', k.nama_ortu],
                ['No. Telp Ortu', k.no_telp_ortu],
                ['Email Ortu', k.email_ortu],
                ['Email Siswa', k.email_siswa],
                ['Asal Sekolah', k.asal_sekolah],
                ['Tanggal Lahir', k.tanggal_lahir ? new Date(k.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null],
                ['Jenis Kelamin', k.jenis_kelamin === 'L' ? 'Laki-laki' : k.jenis_kelamin === 'P' ? 'Perempuan' : null],
                ['Tahun Ajaran', k.tahun_ajaran],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                  <span className="text-sm font-bold text-slate-700">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {[
            { title: 'Jawaban Orang Tua', data: jawabanOrtu },
            { title: 'Jawaban Siswa/Calon',  data: jawabanSiswa },
          ].map(({ title, data: jData }) => (
            <div key={title} className="bg-white rounded-[28px] border-2 border-slate-100 p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={12} /> {title}
              </h3>
              {jData ? (
                <div className="space-y-4">
                  {Object.entries(jData.jawaban || {}).map(([key, val]) => (
                    <div key={key} className="border-b-2 border-slate-50 pb-4 last:border-0 last:pb-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{key}</p>
                      <p className="text-sm font-medium text-slate-700">{String(val)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 gap-2 text-slate-300">
                  <FileText size={28} />
                  <p className="text-xs font-black uppercase tracking-widest">Belum mengisi form</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Tes Akademik */}
      {tab === 'Tes Akademik' && (
        <div className="space-y-4">
          {hasil ? (
            <>
              {/* Skor total */}
              <div className="bg-white rounded-[28px] border-2 border-slate-100 p-8 shadow-sm text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-transparent" />
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Skor Total</p>
                  <p className="text-7xl font-black text-[#1B8B87] tabular-nums tracking-tighter">
                    {Math.round(hasil.total_skor)}
                  </p>
                  {(() => {
                    const p = getPredikat(hasil.total_skor);
                    return (
                      <div className="mt-2">
                        <span className={`text-xl font-black ${p.color}`}>Predikat {p.grade}</span>
                        <span className="text-slate-400 font-bold ml-2">— {p.desc}</span>
                      </div>
                    );
                  })()}
                  <button onClick={exportExcel}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-2xl text-sm font-black hover:bg-teal-600 transition-all">
                    <Download size={15} /> Export Excel
                  </button>
                </div>
              </div>

              {/* Per mapel */}
              {Object.keys(skorPerMapel).length > 0 && (
                <div className="bg-white rounded-[28px] border-2 border-slate-100 p-6 shadow-sm space-y-5">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nilai Per Mata Pelajaran</h3>
                  {Object.entries(skorPerMapel).map(([mapel, data]) => {
                    const skor = Math.round((data.correct / data.total) * 100);
                    const p = getPredikat(skor);
                    return (
                      <div key={mapel}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-black text-slate-700">{mapel}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">{data.correct}/{data.total}</span>
                            <span className={`text-lg font-black tabular-nums ${p.color}`}>{skor}</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${p.color} bg-opacity-10`}>{p.grade}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${p.bar} rounded-full transition-all duration-700`} style={{ width: `${skor}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-[28px] border-2 border-slate-100 p-16 shadow-sm flex flex-col items-center gap-4 text-slate-300">
              <div className="w-20 h-20 rounded-[24px] bg-slate-100 flex items-center justify-center">
                <GraduationCap size={36} className="text-slate-300" />
              </div>
              <p className="font-black uppercase tracking-widest text-sm">Belum mengerjakan tes akademik</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Catatan */}
      {tab === 'Catatan' && (
        <div className="space-y-4">

          {/* AI Summary */}
          <div className="bg-white rounded-[28px] border-2 border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} className="text-purple-500" /> Ringkasan AI
              </h3>
              <button onClick={generateAI} disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl text-xs font-black transition-all disabled:opacity-50">
                <RefreshCw size={13} className={aiLoading ? 'animate-spin' : ''} />
                {aiLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
            {aiSummary || k.ringkasan_ai ? (
              <div
                className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(aiSummary || k.ringkasan_ai) }}
              />
            ) : (
              <p className="text-xs text-slate-400 italic">Klik Generate untuk membuat ringkasan AI dari data kandidat ini.</p>
            )}
          </div>

          {/* Catatan form */}
          <div className="bg-white rounded-[28px] border-2 border-slate-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={12} /> Catatan Wawancara
              </h3>
              {existingCatatan && (
                <span className={`text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1 ${isLocked ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-600'}`}>
                  {isLocked ? <><Lock size={11} /> Dikunci</> : <><CheckCircle2 size={11} /> Tersimpan</>}
                </span>
              )}
            </div>

            {isLocked ? (
              <div className="space-y-3 opacity-75 pointer-events-none">
                {catatanFields.map(([field, label]) =>
                  form[field] ? (
                    <div key={field} className="border-2 border-slate-100 rounded-2xl p-4 bg-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{form[field]}</p>
                    </div>
                  ) : null
                )}
                {form.rekomendasi && (
                  <div className="border-2 border-slate-100 rounded-2xl p-4 bg-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rekomendasi</p>
                    <span className={`inline-block px-4 py-1.5 rounded-xl text-sm font-black ${
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
                    <textarea className={ta}
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                  </div>
                ))}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Rekomendasi Akhir</label>
                  <div className="flex gap-3">
                    {REKOMENDASI.map(r => (
                      <button key={r.value} type="button"
                        onClick={() => setForm(f => ({ ...f, rekomendasi: f.rekomendasi === r.value ? '' : r.value }))}
                        className={`flex-1 py-3 rounded-2xl text-sm font-black text-white transition-all ${r.cls} ${form.rekomendasi === r.value ? r.activeCls : 'opacity-40 hover:opacity-70'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                  className="w-full py-4 bg-[#1B8B87] hover:bg-teal-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wide">
                  {saveMut.isPending ? 'Menyimpan...' : existingCatatan ? 'Perbarui Catatan' : 'Simpan Catatan'}
                </button>
                {saveMut.isSuccess && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">
                    <CheckCircle2 size={16} /> Catatan berhasil disimpan!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
