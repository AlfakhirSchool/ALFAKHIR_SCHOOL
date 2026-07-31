'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, CheckCircle2, Clock, FileText, ArrowRight, Bell, Users, TrendingUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Menunggu' },
  REVIEW:   { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400',    label: 'Wawancara' },
  DITERIMA: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Diterima' },
  DITOLAK:  { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400',     label: 'Ditolak' },
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
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const today = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <Header title="Dashboard Pewawancara" />

      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0D6E6A] via-[#1B8B87] to-[#2AA99F] px-6 py-8 md:px-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-teal-200 text-sm font-medium mb-1">{greeting},</p>
            <h1 className="text-2xl md:text-3xl font-black text-white">{user?.nama || 'Pewawancara'}</h1>
            <p className="text-teal-300 text-sm mt-1">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/interviewer/sd"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all border border-white/20">
              Unit SD
            </Link>
            <Link href="/interviewer/smp"
              className="px-4 py-2 bg-white text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 transition-all">
              Unit SMP
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-4">
          {[
            { label: 'Kandidat Saya', value: stats.total,        icon: Users,         gradient: 'from-teal-500 to-teal-600',    shadow: 'shadow-teal-200' },
            { label: 'Sudah Dicatat', value: stats.sudahDicatat, icon: CheckCircle2,  gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-200' },
            { label: 'Formulir Masuk',value: stats.formulirMasuk,icon: FileText,      gradient: 'from-blue-500 to-blue-600',    shadow: 'shadow-blue-200' },
            { label: 'Belum Dicatat', value: stats.belumDicatat, icon: Clock,         gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-200' },
          ].map(({ label, value, icon: Icon, gradient, shadow }) => (
            <div key={label} className={`bg-white rounded-2xl p-5 shadow-lg ${shadow}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-2xl font-black text-slate-800">{isLoading ? '—' : value}</p>
              <p className="text-xs text-slate-400 mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-teal-600" />
              <span className="font-bold text-slate-700">Progress Wawancara</span>
            </div>
            <span className="text-sm font-semibold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
              {stats.sudahDicatat}/{stats.total} selesai
            </span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-700 relative"
              style={{ width: `${pct}%` }}
            >
              {pct > 10 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-white">
                  {pct}%
                </span>
              )}
            </div>
          </div>
          {pct === 0 && (
            <p className="text-xs text-slate-400 mt-2 text-center">Belum ada kandidat yang diwawancara</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Kandidat list */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-teal-600" />
                <h3 className="font-bold text-slate-700 text-sm">Kandidat Saya</h3>
              </div>
              <Link href="/interviewer" className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1">
                Lihat Semua <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                  <div className="w-8 h-8 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Memuat...</p>
                </div>
              ) : kandidat.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Users size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm">Belum ada kandidat ditugaskan.</p>
                </div>
              ) : kandidat.slice(0, 8).map(k => {
                const cfg = STATUS_CONFIG[k.status] || STATUS_CONFIG.PENDING;
                return (
                  <Link key={k.id} href={`/interviewer/${k.level?.toLowerCase()}/${k.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-teal-50/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(k.nama_diperbaiki || k.nama || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{k.nama_diperbaiki || k.nama}</p>
                        <p className="text-xs text-slate-400">{k.level}{k.skor_akademik != null ? ` · Skor: ${k.skor_akademik}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <ArrowRight size={13} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-teal-600" />
                <h3 className="font-bold text-slate-700 text-sm">Aktivitas Terbaru</h3>
              </div>
              <span className="text-xs text-slate-400">Auto-refresh 30s</span>
            </div>
            <div className="divide-y divide-slate-50">
              {feed.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Bell size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm">Belum ada aktivitas.</p>
                </div>
              ) : feed.map((item: any, i: number) => (
                <div key={item.id || i} className="px-5 py-3 flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{item.title || item.type}</p>
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
