'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Download, Search, ChevronLeft, FileText, Film, Image as ImageIcon, User } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

// Cycling color palettes for mapel cards (matches design: tertiary-fixed, secondary-fixed, primary-fixed, error-container, surface-container-highest)
const CARD_PALETTES = [
  { bg: '#c4e7ff', color: '#001e2c' },
  { bg: '#dae2fd', color: '#131b2e' },
  { bg: '#ffdbc8', color: '#321200' },
  { bg: '#ffdad6', color: '#93000a' },
  { bg: '#e0e3e5', color: '#191c1e' },
  { bg: '#ecfdf5', color: '#065f46' },
  { bg: '#f5f3ff', color: '#4c1d95' },
  { bg: '#fef9c3', color: '#713f12' },
];

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
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
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
      params: { mata_pelajaran_id: selectedMapel },
    }).then(r => r.data.data ?? []),
    enabled: !!selectedMapel,
  });

  const filtered = materiList.filter((m: any) =>
    !search || m.judul.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMapelObj = mapelList.find((m: any) => m.id === selectedMapel);
  const mapelStyle = selectedMapelObj
    ? (MAPEL_COLORS[selectedMapelObj.kode] || MAPEL_COLORS.DEFAULT)
    : null;

  return (
    <div className="min-h-screen bg-[#f7f9fb]">

      {/* Fixed header */}
      <header className="bg-white fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 border-b border-[#e6e8ea]">
        {selectedMapel ? (
          <button onClick={() => { setSelectedMapel(''); setSearch(''); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#eceef0] transition-colors mr-2">
            <ChevronLeft size={22} className="text-[#191c1e]" />
          </button>
        ) : (
          <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#eceef0] transition-colors mr-2">
            <ChevronLeft size={22} className="text-[#191c1e]" />
          </Link>
        )}
        <h1 className="text-lg font-bold text-[#191c1e] flex-1">
          {selectedMapelObj ? selectedMapelObj.nama : 'Materi Pelajaran'}
        </h1>
        {selectedMapel && (
          <div className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: mapelStyle?.bg, color: mapelStyle?.color }}>
            {filtered.length} materi
          </div>
        )}
      </header>

      <main className="pt-20 px-5 pb-28">

        {/* Mapel grid — hanya tampil saat belum pilih */}
        {!selectedMapel && (
          <>
            <p className="text-xs font-bold text-[#574237] uppercase tracking-[0.1em] mb-4">Pilih Mata Pelajaran</p>
            <div className="grid grid-cols-2 gap-4">
              {mapelList.map((m: any, idx: number) => {
                const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
                return (
                  <button key={m.id}
                    onClick={() => setSelectedMapel(m.id)}
                    className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 shadow-[0px_8px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow active:scale-[0.98]">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-1"
                      style={{ background: palette.bg, color: palette.color }}>
                      <BookOpen size={24} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-semibold text-[#191c1e] leading-snug">{m.nama}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Search + materi list — tampil saat mapel dipilih */}
        {selectedMapel && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b7265]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari materi..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e6e8ea] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f47b20]/30"
              />
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-5 shadow-sm">
                  <BookOpen size={32} className="text-[#dec1b1]" />
                </div>
                <p className="font-bold text-[#574237] text-base">
                  {search ? 'Tidak ditemukan' : 'Belum ada materi'}
                </p>
                <p className="text-xs text-[#8b7265] mt-1 text-center max-w-[200px]">
                  {search ? `Tidak ada materi untuk "${search}"` : 'Guru belum mengupload materi untuk pelajaran ini'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((m: any) => {
                  const ext = getExt(m.file_name || '');
                  const fc = fileColor(ext);
                  return (
                    <div key={m.id} className="bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] border border-white/80 overflow-hidden">
                      <div className="p-4 flex gap-4">
                        {/* Thumbnail area */}
                        <div className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: fc.bg + '55' }}>
                          <div style={{ color: fc.color }}>
                            <FileIcon ext={ext} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <p className="font-bold text-sm text-[#191c1e] leading-snug">{m.judul}</p>
                          {m.deskripsi && (
                            <p className="text-xs text-[#574237] mt-1 line-clamp-2">{m.deskripsi}</p>
                          )}
                          {m.guru && (
                            <p className="text-[11px] text-[#565e74] mt-1.5 flex items-center gap-1">
                              <User size={11} className="flex-shrink-0" />
                              {m.guru.user?.nama || '-'}
                            </p>
                          )}
                          {m.file_size && (
                            <p className="text-[11px] text-[#565e74] flex items-center gap-1">
                              <FileText size={11} className="flex-shrink-0" />
                              {fmtSize(m.file_size)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 px-4 pb-4">
                        {m.link_video && (
                          <a href={m.link_video} target="_blank" rel="noopener"
                            className="flex-1 h-10 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5"
                            style={{ background: '#f47b20' }}>
                            ▶ Tonton
                          </a>
                        )}
                        {m.file_url ? (
                          <a href={`${API_BASE}${m.file_url}`} target="_blank" rel="noopener"
                            className="flex-1 h-10 rounded-lg text-xs font-bold text-[#191c1e] border border-[#dec1b1] flex items-center justify-center gap-1.5 bg-white">
                            <Download size={13} /> Unduh
                          </a>
                        ) : !m.link_video ? (
                          <span className="text-[10px] text-[#8b7265] italic self-center">Tanpa file</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
