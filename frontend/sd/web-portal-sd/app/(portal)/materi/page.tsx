'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Download, Search, ChevronLeft, FileText, Film, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

const MAPEL_COLORS: Record<string, { bg: string; color: string }> = {
  MTK:  { bg: '#EFF6FF', color: '#3B82F6' },
  BIN:  { bg: '#FEF9C3', color: '#CA8A04' },
  IPA:  { bg: '#ECFDF5', color: '#10B981' },
  IPS:  { bg: '#FFF7ED', color: '#F97316' },
  PAI:  { bg: '#F5F3FF', color: '#8B5CF6' },
  PKN:  { bg: '#FEF2F2', color: '#EF4444' },
  ENG:  { bg: '#F0F9FF', color: '#0EA5E9' },
  SBK:  { bg: '#FDF4FF', color: '#A855F7' },
  PJOK: { bg: '#F0FDF4', color: '#16A34A' },
  DEFAULT: { bg: '#F8FAFC', color: '#64748B' },
};

function getExt(filename: string) {
  return filename?.split('.').pop()?.toLowerCase() || '';
}

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function FileIcon({ ext }: { ext: string }) {
  if (['mp4', 'mov', 'avi'].includes(ext)) return <Film size={20} />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <ImageIcon size={20} />;
  return <FileText size={20} />;
}

function fileColor(ext: string) {
  if (['pdf'].includes(ext)) return { bg: '#FEF2F2', color: '#EF4444' };
  if (['doc', 'docx'].includes(ext)) return { bg: '#EFF6FF', color: '#3B82F6' };
  if (['ppt', 'pptx'].includes(ext)) return { bg: '#FFF7ED', color: '#F97316' };
  if (['mp4', 'mov'].includes(ext)) return { bg: '#F5F3FF', color: '#8B5CF6' };
  if (['jpg', 'jpeg', 'png'].includes(ext)) return { bg: '#ECFDF5', color: '#10B981' };
  return { bg: '#F8FAFC', color: '#64748B' };
}

export default function MateriSiswaPage() {
  const searchParams = useSearchParams();
  const initMapel = searchParams.get('mapel') || '';
  const [selectedMapel, setSelectedMapel] = useState(initMapel);
  const [search, setSearch] = useState('');

  const { data: mapelList = [] } = useQuery({
    queryKey: ['portal-mapel-list'],
    queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data ?? []),
  });

  const { data: materiList = [], isLoading } = useQuery({
    queryKey: ['portal-materi-all', selectedMapel],
    queryFn: () => api.get('/materi', {
      params: selectedMapel ? { mata_pelajaran_id: selectedMapel } : {},
    }).then(r => r.data.data ?? []),
  });

  const filtered = materiList.filter((m: any) =>
    !search || m.judul.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMapelObj = mapelList.find((m: any) => m.id === selectedMapel);
  const mapelStyle = selectedMapelObj
    ? (MAPEL_COLORS[selectedMapelObj.kode] || MAPEL_COLORS.DEFAULT)
    : null;

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-10 pb-3">
          <Link href="/"
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="font-black text-gray-900 text-lg leading-none">Materi Pelajaran</h1>
            {selectedMapelObj && (
              <p className="text-xs font-semibold mt-0.5" style={{ color: mapelStyle?.color }}>
                {selectedMapelObj.nama}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center bg-orange-50 rounded-xl px-2.5 py-1.5">
            <span className="font-black text-base leading-none text-[#F97316]">{filtered.length}</span>
            <span className="text-[9px] text-orange-400 font-medium">Materi</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari materi..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            />
          </div>
        </div>

        {/* Filter banner cards — landscape compact */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <button onClick={() => setSelectedMapel('')}
            className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl active:scale-95 transition-transform"
            style={{ background: !selectedMapel ? 'linear-gradient(135deg,#FF8C38,#E8620D)' : '#F3F4F6' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: !selectedMapel ? 'rgba(255,255,255,0.25)' : '#E5E7EB' }}>
              <BookOpen size={13} style={{ color: !selectedMapel ? '#fff' : '#9CA3AF' }} />
            </div>
            <span className="font-bold text-xs" style={{ color: !selectedMapel ? '#fff' : '#6B7280' }}>Semua</span>
          </button>

          {mapelList.map((m: any) => {
            const s = MAPEL_COLORS[m.kode] || MAPEL_COLORS.DEFAULT;
            const active = selectedMapel === m.id;
            return (
              <button key={m.id}
                onClick={() => setSelectedMapel(m.id === selectedMapel ? '' : m.id)}
                className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl active:scale-95 transition-transform"
                style={{ background: active ? s.color : s.bg }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: active ? 'rgba(255,255,255,0.25)' : s.color + '25' }}>
                  <BookOpen size={13} style={{ color: active ? '#fff' : s.color }} />
                </div>
                <span className="font-bold text-xs" style={{ color: active ? '#fff' : s.color }}>{m.nama}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-28 space-y-3">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mb-5 shadow-sm">
              <BookOpen size={32} className="text-gray-200" />
            </div>
            <p className="font-bold text-gray-500 text-base">
              {search ? 'Tidak ditemukan' : 'Belum ada materi'}
            </p>
            <p className="text-xs text-gray-400 mt-1 text-center max-w-[200px]">
              {search
                ? `Tidak ada materi untuk "${search}"`
                : 'Guru belum mengupload materi untuk pelajaran ini'}
            </p>
          </div>
        ) : (
          filtered.map((m: any) => {
            const ext = getExt(m.file_name || '');
            const fc = fileColor(ext);
            const mapelStyle2 = m.mata_pelajaran
              ? (MAPEL_COLORS[m.mata_pelajaran.kode] || MAPEL_COLORS.DEFAULT)
              : MAPEL_COLORS.DEFAULT;

            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  {/* File type icon */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: fc.bg, color: fc.color }}>
                    <FileIcon ext={ext} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 leading-snug">{m.judul}</p>

                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {m.mata_pelajaran && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: mapelStyle2.bg, color: mapelStyle2.color }}>
                          {m.mata_pelajaran.nama}
                        </span>
                      )}
                      {m.kelas && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {m.kelas.nama}
                        </span>
                      )}
                    </div>

                    {m.deskripsi && (
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{m.deskripsi}</p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        {m.guru && <span>oleh {m.guru.nama}</span>}
                        {m.file_size && <span>· {fmtSize(m.file_size)}</span>}
                        <span>· {fmtDate(m.created_at)}</span>
                      </div>

                      {m.file_url ? (
                        <a href={`${API_BASE}${m.file_url}`} target="_blank" rel="noopener"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                          style={{ background: fc.color }}>
                          <Download size={12} /> Unduh
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-300 italic">Tanpa file</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
