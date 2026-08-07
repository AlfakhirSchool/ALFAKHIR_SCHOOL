'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Search, ChevronRight, CheckCircle2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type Kandidat = { id: string; nama: string; nama_diperbaiki: string | null; level: string; tahun_ajaran: string };

export default function TesPortalPage() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('SMP');
  const [kandidat, setKandidat] = useState<Kandidat[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setKandidat([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/kandidat/publik/cari?search=${encodeURIComponent(search)}&level=${level}`);
        const data = await res.json();
        setKandidat(data.data || []);
      } catch { setKandidat([]); }
      setLoading(false);
      setSearched(true);
    }, 400);
    return () => clearTimeout(t);
  }, [search, level]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-20">
      <div className="max-w-2xl mx-auto space-y-10 pt-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative h-28 w-28 mx-auto">
            <div className="absolute inset-0 bg-teal-500/20 rounded-[40px] blur-2xl" />
            <div className="relative h-28 w-28 bg-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-teal-500/10 border border-teal-50 p-3">
              <GraduationCap className="w-14 h-14 text-[#1B8B87]" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Tes Akademik</h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">SMP Islam Al Fakhir</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-slate-200 border border-slate-100 space-y-6">
          {/* Level */}
          <div className="flex gap-2">
            {['SD', 'SMP', 'SMA'].map(l => (
              <button key={l} onClick={() => setLevel(l)}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${level === l ? 'bg-[#1B8B87] text-white shadow-lg shadow-teal-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Search */}
          <div>
            <div className="space-y-1 mb-3">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Search className="h-5 w-5 text-[#1B8B87]" />
                Cari Nama Anda
              </h2>
              <p className="text-sm text-slate-500">Ketik nama untuk mulai mengerjakan soal.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
              <input
                type="text"
                placeholder="Tulis nama lengkap Anda..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-16 pl-14 pr-6 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-[#1B8B87] focus:bg-white outline-none transition-all font-bold text-slate-800 text-lg"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {loading && (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
            {!loading && searched && kandidat.length === 0 && (
              <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400 italic">
                  {search ? `Nama "${search}" tidak ditemukan untuk jenjang ${level}.` : 'Ketik nama Anda.'}
                </p>
              </div>
            )}
            {!loading && kandidat.map(k => (
              <Link key={k.id} href={`/tes/${k.id}`}
                className="group flex items-center justify-between p-5 rounded-3xl border-2 border-slate-50 bg-slate-50/30 hover:border-[#1B8B87] hover:bg-teal-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#1B8B87]/10 flex items-center justify-center">
                    <span className="text-[#1B8B87] font-black text-lg">{(k.nama_diperbaiki || k.nama).charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{k.nama_diperbaiki || k.nama}</p>
                    <p className="text-xs text-slate-400">{k.level} · {k.tahun_ajaran}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#1B8B87] transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Hubungi panitia jika nama Anda tidak ditemukan.
        </p>
      </div>
    </div>
  );
}
