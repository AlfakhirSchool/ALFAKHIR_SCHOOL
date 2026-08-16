'use client';

import Link from 'next/link';
import { ChevronLeft, Megaphone, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const KATEGORI_STYLE: Record<string, { color: string; bg: string }> = {
  Pengumuman:  { color: '#F97316', bg: '#FFF7ED' },
  Kegiatan:    { color: '#3B82F6', bg: '#EFF6FF' },
  'Info Sekolah': { color: '#10B981', bg: '#ECFDF5' },
  Prestasi:    { color: '#8B5CF6', bg: '#F5F3FF' },
  DEFAULT:     { color: '#64748B', bg: '#F8FAFC' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PengumumanPage() {
  const { data: list = [], isLoading } = useQuery({
    queryKey: ['portal-pengumuman-page'],
    queryFn: () => api.get('/pengumuman').then(r => r.data.data ?? []),
  });

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      <div className="bg-white sticky top-0 z-30 shadow-sm px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="font-black text-gray-900 text-lg leading-none">Pengumuman</h1>
            <p className="text-xs text-gray-400">Berita & informasi sekolah</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 pb-28 space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)
        ) : list.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Megaphone size={20} className="text-gray-300" />
            </div>
            <p className="text-xs text-gray-400">Belum ada pengumuman</p>
          </div>
        ) : (
          list.map((item: any) => {
            const s = KATEGORI_STYLE[item.kategori] || KATEGORI_STYLE.DEFAULT;
            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-1" style={{ background: s.color }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: s.bg, color: s.color }}>
                      {item.kategori || 'Pengumuman'}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Calendar size={10} />
                      <span>{fmtDate(item.tanggal_publish || item.created_at)}</span>
                    </div>
                  </div>
                  <p className="font-black text-sm text-gray-800 leading-snug mb-1.5">{item.judul}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.isi}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
