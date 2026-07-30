'use client';

import { useState } from 'react';
import { GraduationCap, CheckCircle2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function FormPendaftaranPage() {
  const [form, setForm] = useState({
    nama: '', level: 'SMP', nama_ortu: '', no_telp_ortu: '',
    email_ortu: '', asal_sekolah: '', jenis_kelamin: '', tanggal_lahir: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.level) return;
    setSubmitting(true); setErr('');
    try {
      const res = await fetch(`${API}/kandidat/daftar-publik`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setErr(data.message || 'Gagal mengirim');
    } catch { setErr('Koneksi gagal'); }
    setSubmitting(false);
  };

  if (done) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white rounded-[40px] p-10 shadow-2xl text-center max-w-md w-full">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Pendaftaran Terkirim!</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Terima kasih! Tim kami akan menghubungi Anda melalui nomor atau email yang didaftarkan untuk informasi selanjutnya.
        </p>
      </div>
    </div>
  );

  const inputCls = "w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-[#1B8B87] focus:bg-white outline-none transition-all font-bold text-slate-800";
  const labelCls = "block text-xs font-black text-slate-400 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-20">
      <div className="max-w-2xl mx-auto space-y-10 pt-10">
        <div className="text-center space-y-4">
          <div className="relative h-28 w-28 mx-auto">
            <div className="absolute inset-0 bg-teal-500/20 rounded-[40px] blur-2xl" />
            <div className="relative h-28 w-28 bg-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-teal-500/10 border border-teal-50 p-3">
              <GraduationCap className="w-14 h-14 text-[#1B8B87]" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Formulir Pendaftaran</h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">SMP Islam Al Fakhir</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[40px] p-8 shadow-2xl shadow-slate-200 border border-slate-100 space-y-6">
          <div>
            <label className={labelCls}>Jenjang *</label>
            <div className="flex gap-2">
              {['SD', 'SMP', 'SMA'].map(l => (
                <button type="button" key={l} onClick={() => setForm(f => ({...f, level: l}))}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${form.level === l ? 'bg-[#1B8B87] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Nama Lengkap Calon Siswa *</label>
            <input required className={inputCls} placeholder="Nama sesuai akta kelahiran" value={form.nama} onChange={e => setForm(f => ({...f, nama: e.target.value}))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Jenis Kelamin</label>
              <select className={inputCls} value={form.jenis_kelamin} onChange={e => setForm(f => ({...f, jenis_kelamin: e.target.value}))}>
                <option value="">Pilih...</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Tanggal Lahir</label>
              <input type="date" className={inputCls} value={form.tanggal_lahir} onChange={e => setForm(f => ({...f, tanggal_lahir: e.target.value}))} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Asal Sekolah</label>
            <input className={inputCls} placeholder="SD/MI asal" value={form.asal_sekolah} onChange={e => setForm(f => ({...f, asal_sekolah: e.target.value}))} />
          </div>

          <div className="border-t border-slate-100 pt-6">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Data Orang Tua / Wali</p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Nama Orang Tua / Wali</label>
                <input className={inputCls} placeholder="Nama lengkap" value={form.nama_ortu} onChange={e => setForm(f => ({...f, nama_ortu: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>No. HP</label>
                  <input type="tel" className={inputCls} placeholder="08xxxxxxxxxx" value={form.no_telp_ortu} onChange={e => setForm(f => ({...f, no_telp_ortu: e.target.value}))} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" className={inputCls} placeholder="email@example.com" value={form.email_ortu} onChange={e => setForm(f => ({...f, email_ortu: e.target.value}))} />
                </div>
              </div>
            </div>
          </div>

          {err && <p className="text-red-500 text-sm font-bold text-center">{err}</p>}

          <button type="submit" disabled={submitting || !form.nama}
            className={`w-full h-14 rounded-3xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 ${form.nama ? 'bg-[#1B8B87] hover:bg-teal-600 text-white shadow-xl shadow-teal-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            {submitting ? 'Mengirim...' : 'Kirim Pendaftaran'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Hubungi panitia jika butuh bantuan: <strong>smpislamalfakhir@gmail.com</strong>
        </p>
      </div>
    </div>
  );
}
