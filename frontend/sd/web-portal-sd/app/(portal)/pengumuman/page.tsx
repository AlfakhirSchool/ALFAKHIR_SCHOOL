'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, Calendar, RefreshCw, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

const KATEGORI_STYLE: Record<string, { color: string; bg: string }> = {
  Pengumuman:     { color: '#f47b20', bg: '#ffdbc8' },
  Kegiatan:       { color: '#3b5bdb', bg: '#dae2fd' },
  'Info Sekolah': { color: '#059669', bg: '#ecfdf5' },
  Prestasi:       { color: '#7c3aed', bg: '#f5f3ff' },
  DEFAULT:        { color: '#565e74', bg: '#e0e3e5' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AnimatedBell() {
  return (
    <div className="relative w-20 h-20 mx-auto mb-5">
      <div className="absolute inset-0 rounded-full bg-[#ffdbc8]/40 animate-ping" style={{ animationDuration: '2s' }} />
      <div className="relative w-20 h-20 rounded-full bg-[#ffdbc8] flex items-center justify-center">
        <Bell size={32} className="text-[#994700]" style={{ animation: 'bellRing 2s ease-in-out infinite' }} />
      </div>
      <style jsx>{`
        @keyframes bellRing {
          0%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(12deg); }
          20%, 40% { transform: rotate(-12deg); }
          50% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

export default function PengumumanPage() {
  const { data: list = [], isLoading, refetch } = useQuery({
    queryKey: ['portal-pengumuman-page'],
    queryFn: () => api.get('/pengumuman').then(r => r.data.data ?? []),
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e9e0d8] h-[60px] flex items-center gap-3 px-4">
        <Link href="/" className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
          <ChevronLeft size={20} className="text-[#191c1e]" />
        </Link>
        <div className="flex-1">
          <h1 className="font-black text-[#191c1e] text-base leading-none">Pengumuman</h1>
          <p className="text-[11px] text-[#8b7265]">Berita & info sekolah</p>
        </div>
      </header>

      <div className="pt-[60px] pb-28 px-4 py-4 space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />)
        ) : list.length === 0 ? (

          /* Empty state — glass card */
          <div className="mt-8 mx-2 bg-white rounded-3xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.08)] p-8 flex flex-col items-center text-center overflow-hidden relative">
            {/* Decorative glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#ffdbc8]/40 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[#dae2fd]/40 blur-2xl pointer-events-none" />

            <div className="relative">
              <AnimatedBell />
            </div>

            <p className="font-black text-[#191c1e] text-lg mb-1.5">Belum ada pengumuman</p>
            <p className="text-sm text-[#8b7265] leading-relaxed max-w-[220px]">
              Pengumuman dari sekolah akan muncul di sini
            </p>

            <button
              onClick={() => refetch()}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f47b20] text-white text-sm font-bold shadow-sm active:scale-95 transition-transform">
              <RefreshCw size={14} />
              Perbarui
            </button>
          </div>

        ) : (
          list.map((item: any) => {
            const s = KATEGORI_STYLE[item.kategori] || KATEGORI_STYLE.DEFAULT;
            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
                {/* Top accent */}
                <div className="h-1 w-full" style={{ background: s.color }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: s.bg, color: s.color }}>
                      {item.kategori || 'Pengumuman'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8b7265]">
                      <Calendar size={11} />
                      <span>{fmtDate(item.tanggal_publish || item.created_at)}</span>
                    </div>
                  </div>
                  <p className="font-black text-sm text-[#191c1e] leading-snug mb-1.5">{item.judul}</p>
                  <p className="text-xs text-[#565e74] leading-relaxed">{item.isi}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
