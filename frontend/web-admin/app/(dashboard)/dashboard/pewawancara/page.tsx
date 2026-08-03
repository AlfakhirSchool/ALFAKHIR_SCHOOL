'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FileText, CheckCircle, Clock, ArrowRight, TrendingUp, Bell,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Menunggu' },
  REVIEW:   { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Wawancara' },
  DITERIMA: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Diterima' },
  DITOLAK:  { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Ditolak' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function DashboardPewawancaraPage() {
  const { user } = useAuthStore();

  const { data: kandidatData, isLoading } = useQuery({
    queryKey: ['kandidat-pewawancara'],
    queryFn: () => api.get('/kandidat', { params: { limit: 500 } }).then(r => r.data),
  });

  const { data: feedData } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => api.get('/jawaban-form/activity-feed').then(r => r.data.data || []),
    refetchInterval: 30000,
  });

  const allKandidat: any[] = kandidatData?.data || [];
  const kandidat = useMemo(
    () => allKandidat.filter(k => k.pewawancara_nama === user?.nama),
    [allKandidat, user?.nama]
  );

  const stats = useMemo(() => ({
    total: kandidat.length,
    sudahDicatat: kandidat.filter(k => k.status !== 'PENDING').length,
    formulirMasuk: allKandidat.filter(k => k.status !== 'PENDING').length,
    belumDicatat: kandidat.filter(k => k.status === 'PENDING').length,
  }), [kandidat, allKandidat]);

  const pct = stats.total > 0 ? Math.round((stats.sudahDicatat / stats.total) * 100) : 0;
  const feed: any[] = (feedData || []).slice(0, 5);

  const kpis = [
    { label: 'Siswa Saya',       value: stats.total,         icon: Users,        color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Formulir Masuk',   value: stats.formulirMasuk, icon: FileText,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Selesai Dicatat',  value: stats.sudahDicatat,  icon: CheckCircle,  color: 'text-purple-600',  bg: 'bg-purple-50' },
    { label: 'Perlu Tindakan',   value: stats.belumDicatat,  icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50' },
  ];

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 pb-20">
      <Header title="Dashboard Pewawancara" />

      <div className="px-6 max-w-5xl mx-auto w-full space-y-10">

        {/* Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">
            Halo, {user?.nama || 'Pewawancara'}!
          </h1>
          <p className="text-slate-400 font-medium tracking-wide">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="h-1.5 w-32 bg-teal-500 rounded-full mt-1" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="group p-8 rounded-[32px] bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-7 w-7 ${color}`} />
                </div>
                <TrendingUp className="h-5 w-5 text-slate-100 group-hover:text-teal-500 transition-colors" />
              </div>
              <p className="text-4xl font-black text-slate-900 tracking-tight">{isLoading ? '—' : value}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-slate-800 text-lg uppercase italic tracking-tight">Progress Wawancara</h3>
            <span className="text-sm font-bold text-teal-600 bg-teal-50 px-4 py-1.5 rounded-full">
              {stats.sudahDicatat} / {stats.total} selesai
            </span>
          </div>
          <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
              style={{ width: `${Math.max(pct, pct > 0 ? 8 : 0)}%` }}
            >
              {pct > 12 && <span className="text-[11px] font-black text-white">{pct}%</span>}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{pct === 0 ? 'Belum ada wawancara yang diselesaikan' : `${pct}% selesai`}</p>
        </div>

        {/* Kandidat + Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
              <h3 className="font-black text-slate-800 uppercase italic tracking-tight">Kandidat Saya</h3>
              <Link href="/interviewer" className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
                Lihat Semua <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : kandidat.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-[20px] bg-slate-100 flex items-center justify-center">
                    <Users className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Belum ada kandidat</p>
                </div>
              ) : kandidat.slice(0, 8).map(k => {
                const cfg = STATUS_CONFIG[k.status] || STATUS_CONFIG.PENDING;
                return (
                  <Link key={k.id} href={`/interviewer/${k.level?.toLowerCase()}/${k.id}`}
                    className="flex items-center justify-between px-7 py-3.5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-teal-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                        {(k.nama_diperbaiki || k.nama || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{k.nama_diperbaiki || k.nama}</p>
                        <p className="text-xs text-slate-400 font-medium">{k.level}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
              <h3 className="font-black text-slate-800 uppercase italic tracking-tight">Aktivitas Terbaru</h3>
              <Bell className="h-4 w-4 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-50">
              {feed.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-[20px] bg-slate-100 flex items-center justify-center">
                    <Bell className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Belum ada aktivitas</p>
                </div>
              ) : feed.map((item: any, i: number) => (
                <div key={item.id || i} className="px-7 py-4 flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{item.title || item.type}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                    <p className="text-xs text-slate-300 mt-1">{timeAgo(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
