'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Search, User, Users } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
type Kandidat = { id: string; nama: string; nama_diperbaiki: string | null; level: string; tahun_ajaran: string };

export default function FormPortalPage() {
  const [level, setLevel] = useState('SMP');
  const [search, setSearch] = useState('');
  const [kandidat, setKandidat] = useState<Kandidat[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Kandidat | null>(null);
  const [jawabanStatus, setJawabanStatus] = useState<string[]>([]);

  useEffect(() => {
    if (search.length < 2) { setKandidat([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/kandidat/publik/cari?search=${encodeURIComponent(search)}&level=${level}`);
        const data = await res.json();
        setKandidat(data.data || []);
      } catch { setKandidat([]); }
      setLoading(false); setSearched(true);
    }, 400);
    return () => clearTimeout(t);
  }, [search, level]);

  useEffect(() => {
    if (!selected) return;
    fetch(`${API}/jawaban-form/kandidat/${selected.id}`).then(r => r.json()).then(d => {
      setJawabanStatus((d.data || []).map((j: any) => j.role));
    }).catch(() => setJawabanStatus([]));
  }, [selected]);

  const nama = selected ? (selected.nama_diperbaiki || selected.nama) : '';

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-20">
      <div className="max-w-2xl mx-auto space-y-8 pt-10">
        <div className="text-center space-y-4">
          <div className="relative h-24 w-24 mx-auto">
            <div className="absolute inset-0 bg-teal-500/20 rounded-[36px] blur-2xl" />
            <div className="relative h-24 w-24 bg-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-teal-500/10 border border-teal-50">
              <GraduationCap className="w-12 h-12 text-[#1B8B87]" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Formulir Observasi</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">SMP Islam Al Fakhir</p>
          </div>
        </div>

        <div className="bg-white rounded-[36px] p-7 shadow-xl shadow-slate-200/60 border border-slate-100 space-y-5">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Pilih Jenjang</p>
            <div className="flex gap-2">
              {['SD', 'SMP'].map(l => (
                <button key={l} onClick={() => { setLevel(l); setSelected(null); }}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${level === l ? 'bg-[#1B8B87] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Cari Nama Siswa</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              <input type="text" placeholder="Ketik nama lengkap..."
                value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }}
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-[#1B8B87] focus:bg-white outline-none transition-all font-bold text-slate-800" />
            </div>
          </div>

          {loading && <div className="py-6 text-center"><div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>}
          {!loading && searched && kandidat.length === 0 && (
            <p className="text-center text-sm text-slate-400 italic py-4">Nama tidak ditemukan untuk jenjang {level}.</p>
          )}
          {!loading && kandidat.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {kandidat.map(k => (
                <button key={k.id} onClick={() => setSelected(k)}
                  className={`w-full text-left p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${selected?.id === k.id ? 'border-[#1B8B87] bg-teal-50' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1B8B87]/10 flex items-center justify-center text-[#1B8B87] font-black">
                      {(k.nama_diperbaiki || k.nama).charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{k.nama_diperbaiki || k.nama}</p>
                      <p className="text-xs text-slate-400">{k.level} · {k.tahun_ajaran}</p>
                    </div>
                  </div>
                  {selected?.id === k.id && <div className="w-2 h-2 rounded-full bg-[#1B8B87]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-white rounded-[36px] p-7 shadow-xl shadow-slate-200/60 border border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Mengisi formulir untuk</p>
            <p className="text-xl font-black text-slate-900 mb-6">{nama}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { role: 'ortu', label: 'Orang Tua / Wali', icon: Users, desc: 'Formulir untuk orang tua atau wali siswa' },
                { role: 'siswa', label: 'Siswa', icon: User, desc: 'Formulir untuk calon siswa sendiri' },
              ].map(({ role, label, icon: Icon, desc }) => {
                const sudah = jawabanStatus.includes(role);
                return (
                  <Link key={role} href={`/form/${selected.id}?role=${role}`}
                    className={`p-5 rounded-3xl border-2 flex flex-col gap-3 transition-all hover:shadow-lg group ${sudah ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 hover:border-[#1B8B87] hover:bg-teal-50'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${sudah ? 'bg-emerald-100' : 'bg-slate-50 group-hover:bg-teal-100'}`}>
                      <Icon className={`w-6 h-6 ${sudah ? 'text-emerald-500' : 'text-slate-400 group-hover:text-[#1B8B87]'}`} />
                    </div>
                    <div>
                      <p className={`font-black text-sm ${sudah ? 'text-emerald-700' : 'text-slate-800'}`}>{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{sudah ? '✓ Sudah diisi' : desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">Butuh bantuan? <strong>smpislamalfakhir@gmail.com</strong></p>
      </div>
    </div>
  );
}
