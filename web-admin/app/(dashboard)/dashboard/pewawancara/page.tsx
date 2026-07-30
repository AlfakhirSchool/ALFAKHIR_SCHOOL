'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, CheckCircle2, Clock, FileText, ArrowRight, Bell } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Menunggu' },
  REVIEW:   { bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'Wawancara' },
  DITERIMA: { bg: 'bg-emerald-50', text: 'text-emerald-700',label: 'Diterima' },
  DITOLAK:  { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Ditolak' },
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
    formulirMasuk: kandidat.filter(k => k.status !== 'PENDING').length,
    belumDicatat: kandidat.filter(k => k.status === 'PENDING').length,
  }), [kandidat]);

  const pct = stats.total > 0 ? Math.round((stats.sudahDicatat / stats.total) * 100) : 0;
  const feed: any[] = (feedData || []).slice(0, 5);
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const statCards = [
    { label: 'Total Kandidat Saya', value: stats.total,        icon: ClipboardList, color: 'text-teal-600',   bg: 'bg-teal-50' },
    { label: 'Sudah Dicatat',       value: stats.sudahDicatat, icon: CheckCircle2,  color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Formulir Masuk',      value: stats.formulirMasuk,icon: FileText,      color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Belum Dicatat',       value: stats.belumDicatat, icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Dashboard Pewawancara" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-black text-slate-800">Halo, {user?.nama}!</h2>
          <p className="text-sm text-slate-400 mt-0.5">{today} · Dashboard Pewawancara PPDB</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-black text-slate-800">{isLoading ? '—' : value}</p>
              <p className="text-xs text-slate-400 mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
            <span>Progress Wawancara Saya</span>
            <span className="text-teal-600">{stats.sudahDicatat} / {stats.total} sudah dicatat</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1B8B87] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5 text-right">{pct}% selesai</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Kandidat list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-slate-700 text-sm">Kandidat Saya</h3>
              <Link href="/interviewer" className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                Lihat Semua <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading ? (
                <p className="text-center py-8 text-sm text-slate-400">Memuat...</p>
              ) : kandidat.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Belum ada kandidat ditugaskan.</p>
              ) : kandidat.slice(0, 10).map(k => {
                const cfg = STATUS_CONFIG[k.status] || STATUS_CONFIG.PENDING;
                return (
                  <div key={k.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{k.nama_diperbaiki || k.nama}</p>
                      <p className="text-xs text-slate-400">{k.level} {k.skor_akademik != null ? `· Skor: ${k.skor_akademik}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      <Link href={`/interviewer/${k.level.toLowerCase()}/${k.id}`}
                        className="text-xs text-teal-600 hover:underline">Detail</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-slate-700 text-sm">Aktivitas Terbaru</h3>
              <Bell size={14} className="text-slate-400" />
            </div>
            <div className="divide-y divide-gray-50">
              {feed.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Belum ada aktivitas.</p>
              ) : feed.map((item: any) => (
                <div key={item.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-slate-700">{item.title || item.type}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                  <p className="text-xs text-slate-300 mt-1">{timeAgo(item.time)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
