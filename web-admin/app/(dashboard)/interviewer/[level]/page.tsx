'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, CheckCircle2, Clock, FileText } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600 border-amber-200',
  REVIEW: 'bg-blue-50 text-blue-600 border-blue-200',
  DITERIMA: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  DITOLAK: 'bg-red-50 text-red-600 border-red-200',
};
const STATUS_LABEL: Record<string, string> = { PENDING: 'Menunggu', REVIEW: 'Wawancara', DITERIMA: 'Diterima', DITOLAK: 'Ditolak' };

export default function InterviewerLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = use(params);
  const apiLevel = level.toUpperCase();
  const isSD = level === 'sd';
  const { user } = useAuthStore();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['kandidat-level', apiLevel],
    queryFn: () => api.get('/kandidat', { params: { level: apiLevel, limit: 500 } }).then(r => r.data),
  });

  const allKandidat: any[] = data?.data || [];
  const filtered = allKandidat
    .filter(k => (user as any)?.role === 'admin' || k.pewawancara_nama === user?.nama)
    .filter(k => !search || (k.nama_diperbaiki || k.nama).toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: filtered.length,
    dicatat: filtered.filter(k => k.catatan_list?.length > 0 || (k as any).sudah_catatan > 0).length,
    formulir: filtered.filter(k => k.status !== 'PENDING').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/interviewer')}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isSD ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-700'}`}>
              UNIT {apiLevel}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Daftar Kandidat</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700' },
          { label: 'Sudah Dicatat', value: stats.dicatat, color: 'text-emerald-600' },
          { label: 'Formulir Masuk', value: stats.formulir, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        <input type="text" placeholder="Cari nama kandidat..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-teal-400 shadow-sm" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Tidak ada kandidat ditemukan.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(k => {
            const nama = k.nama_diperbaiki || k.nama;
            const sudahCatat = (k.catatan_list?.length > 0) || ((k as any).sudah_catatan > 0);
            return (
              <button key={k.id} onClick={() => router.push(`/interviewer/${level}/${k.id}`)}
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 hover:border-teal-300 hover:shadow-md transition-all text-left shadow-sm">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${isSD ? 'bg-orange-50 text-orange-500' : 'bg-teal-50 text-teal-600'}`}>
                  {nama.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{nama}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLOR[k.status]}`}>
                      {STATUS_LABEL[k.status]}
                    </span>
                    {k.ruangan && <span className="text-xs text-gray-400">Ruang {k.ruangan}</span>}
                    {k.skor_akademik != null && (
                      <span className="text-xs text-teal-600 font-bold">Skor: {Math.round(k.skor_akademik)}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {sudahCatat ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                      <CheckCircle2 size={14} /> Dicatat
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                      <Clock size={14} /> Belum
                    </span>
                  )}
                  <FileText size={16} className="text-gray-300" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
