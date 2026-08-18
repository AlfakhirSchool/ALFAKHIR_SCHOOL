'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { GraduationCap, CheckCircle2, Clock, Search, Trophy, AlertCircle } from 'lucide-react';

type HasilTes = { id: string; total_skor: number; skor_per_mapel: string; created_at: string };
type Kandidat = {
  id: string; nama: string; nama_diperbaiki: string | null;
  level: string; status: string; no_telp_ortu: string | null;
  tahun_ajaran: string; created_at: string;
  hasil_tes_akademik: HasilTes | null;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  DITERIMA: 'bg-green-50 text-green-700 border-green-200',
  DITOLAK: 'bg-red-50 text-red-700 border-red-200',
};
const STATUS_LABEL: Record<string, string> = { PENDING: 'Menunggu', REVIEW: 'Wawancara', DITERIMA: 'Diterima', DITOLAK: 'Ditolak' };

function parseSkorMapel(raw: string): { mapel: string; skor: number }[] {
  try {
    const obj = JSON.parse(raw);
    return Object.entries(obj).map(([mapel, skor]) => ({ mapel, skor: Number(skor) }));
  } catch { return []; }
}

export default function HasilTesPage() {
  const [level, setLevel] = useState('');
  const [filterTes, setFilterTes] = useState<'all' | 'sudah' | 'belum'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['kandidat-hasil-tes'],
    queryFn: () => api.get('/kandidat?limit=500').then(r => r.data.data?.kandidat || r.data.data || []),
  });

  const list: Kandidat[] = data || [];

  const filtered = list.filter(k => {
    if (level && k.level !== level) return false;
    if (filterTes === 'sudah' && !k.hasil_tes_akademik) return false;
    if (filterTes === 'belum' && k.hasil_tes_akademik) return false;
    if (search) {
      const q = search.toLowerCase();
      const nama = (k.nama_diperbaiki || k.nama).toLowerCase();
      if (!nama.includes(q)) return false;
    }
    return true;
  });

  const sudahTes = list.filter(k => k.hasil_tes_akademik).length;
  const belumTes = list.length - sudahTes;
  const avgSkor = sudahTes > 0
    ? Math.round(list.filter(k => k.hasil_tes_akademik).reduce((a, k) => a + k.hasil_tes_akademik!.total_skor, 0) / sudahTes)
    : 0;

  return (
    <div>
      <Header title="Hasil Tes Akademik" />
      <div className="p-6 space-y-6">

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" mb-6>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{sudahTes}</p>
              <p className="text-xs text-slate-500">Sudah Tes</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={22} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{belumTes}</p>
              <p className="text-xs text-slate-500">Belum Tes</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Trophy size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{avgSkor}</p>
              <p className="text-xs text-slate-500">Rata-rata Skor</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama kandidat..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-400"
            />
          </div>
          <div className="flex gap-2">
            {['', 'SD', 'SMP'].map(l => (
              <button key={l} onClick={() => setLevel(l)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${level === l ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}>
                {l || 'Semua'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['all', 'sudah', 'belum'] as const).map(f => (
              <button key={f} onClick={() => setFilterTes(f)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${filterTes === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                {f === 'all' ? 'Semua' : f === 'sudah' ? '✓ Sudah Tes' : '⏳ Belum Tes'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nama</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Level</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status PPDB</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tes Akademik</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Skor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Per Mapel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Memuat data...</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Tidak ada data</td></tr>
                )}
                {filtered.map((k, i) => {
                  const skorMapel = k.hasil_tes_akademik ? parseSkorMapel(k.hasil_tes_akademik.skor_per_mapel) : [];
                  return (
                    <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{k.nama_diperbaiki || k.nama}</p>
                        <p className="text-xs text-slate-400">{k.tahun_ajaran}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${k.level === 'SD' ? 'bg-orange-100 text-orange-700' : k.level === 'SMP' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                          {k.level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLOR[k.status]}`}>
                          {STATUS_LABEL[k.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {k.hasil_tes_akademik ? (
                          <span className="flex items-center gap-1 text-teal-600 text-xs font-semibold">
                            <CheckCircle2 size={14} /> Sudah
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 text-xs">
                            <Clock size={14} /> Belum
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {k.hasil_tes_akademik ? (
                          <span className="text-lg font-black text-indigo-700">{k.hasil_tes_akademik.total_skor}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {skorMapel.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {skorMapel.map(sm => (
                              <span key={sm.mapel} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                                {sm.mapel}: <b>{sm.skor}</b>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} dari {list.length} kandidat
          </div>
        </div>
      </div>
    </div>
  );
}
