'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, CheckCircle, Clock, FileText, Users, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_COLOR: Record<string, string> = {
  PENDING:  'bg-amber-50 text-amber-600 border-amber-200',
  REVIEW:   'bg-blue-50 text-blue-600 border-blue-200',
  DITERIMA: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  DITOLAK:  'bg-red-50 text-red-600 border-red-200',
};
const STATUS_LABEL: Record<string, string> = { PENDING: 'Menunggu', REVIEW: 'Wawancara', DITERIMA: 'Diterima', DITOLAK: 'Ditolak' };

export default function InterviewerLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = use(params);
  const apiLevel = level.toUpperCase();
  const isSD = level === 'sd';
  const accentColor = isSD ? 'text-orange-600' : 'text-teal-600';
  const accentBg = isSD ? 'bg-orange-50' : 'bg-teal-50';
  const accentBorder = isSD ? 'hover:border-orange-400 hover:shadow-orange-100' : 'hover:border-teal-400 hover:shadow-teal-100';
  const accentAvatar = isSD ? 'bg-orange-500' : 'bg-teal-500';
  const { user } = useAuthStore();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['kandidat-level', apiLevel],
    queryFn: () => api.get('/kandidat', { params: { level: apiLevel, limit: 500 } }).then((r: any) => r.data),
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

  const kpis = [
    { label: 'Total Kandidat',  value: stats.total,    icon: Users,       color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Sudah Dicatat',   value: stats.dicatat,  icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Formulir Masuk',  value: stats.formulir, icon: FileText,    color: 'text-purple-600',  bg: 'bg-purple-50' },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/interviewer')}
          className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${accentBg} ${accentColor}`}>
            UNIT {apiLevel}
          </span>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter mt-1">Daftar Kandidat</h1>
          <div className={`h-1.5 w-20 rounded-full mt-2 ${isSD ? 'bg-orange-500' : 'bg-teal-500'}`} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="group p-7 rounded-[32px] bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
              <div className={`h-12 w-12 rounded-2xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <TrendingUp className={`h-4 w-4 text-slate-100 group-hover:${color} transition-colors`} />
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{isLoading ? '—' : value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input type="text" placeholder="Cari nama kandidat..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-teal-400 shadow-sm transition-colors" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <div className="w-10 h-10 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-wide">Memuat...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="w-20 h-20 rounded-[28px] bg-slate-100 flex items-center justify-center">
            <Users className="h-10 w-10 text-slate-300" />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Tidak ada kandidat ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(k => {
            const nama = k.nama_diperbaiki || k.nama;
            const sudahCatat = (k.catatan_list?.length > 0) || ((k as any).sudah_catatan > 0);
            return (
              <button key={k.id} onClick={() => router.push(`/interviewer/${level}/${k.id}`)}
                className={`w-full bg-white border-2 border-slate-100 rounded-3xl p-5 flex items-center gap-4 ${accentBorder} hover:shadow-lg transition-all duration-300 text-left group hover:-translate-y-0.5`}>
                <div className={`w-12 h-12 rounded-2xl ${accentAvatar} flex items-center justify-center font-black text-white text-lg shrink-0`}>
                  {nama.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 truncate text-base">{nama}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-xl text-xs font-bold border ${STATUS_COLOR[k.status]}`}>
                      {STATUS_LABEL[k.status]}
                    </span>
                    {k.ruangan && <span className="text-xs text-slate-400 font-medium">Ruang {k.ruangan}</span>}
                    {k.skor_akademik != null && (
                      <span className={`text-xs font-bold ${accentColor}`}>Skor: {Math.round(k.skor_akademik)}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {sudahCatat ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 font-bold text-xs px-3 py-1.5 rounded-xl">
                      <CheckCircle size={13} /> Dicatat
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-slate-100 text-slate-400 font-bold text-xs px-3 py-1.5 rounded-xl">
                      <Clock size={13} /> Belum
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
