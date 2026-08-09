'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Download, FileText, Search, ChevronLeft, FileDown } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

const FILE_ICON: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', mp4: '🎬',
};

function getExt(filename: string) {
  return filename?.split('.').pop()?.toLowerCase() || '';
}

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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

  const selectedMapelName = mapelList.find((m: any) => m.id === selectedMapel)?.nama || '';

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 px-4 pt-10 pb-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">Materi Pelajaran</h1>
            {selectedMapelName && <p className="text-xs text-gray-400">{selectedMapelName}</p>}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari materi..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            />
          </div>
        </div>

        {/* Filter mapel — horizontal scroll */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedMapel('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              !selectedMapel ? 'bg-[#F97316] text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Semua
          </button>
          {mapelList.map((m: any) => (
            <button
              key={m.id}
              onClick={() => setSelectedMapel(m.id === selectedMapel ? '' : m.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedMapel === m.id ? 'bg-[#F97316] text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {m.nama}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-28 space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Memuat materi...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
              <BookOpen size={28} className="text-gray-200" />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              {search ? 'Materi tidak ditemukan' : 'Belum ada materi'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Coba kata kunci lain' : 'Guru belum mengupload materi untuk pelajaran ini'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 px-1">{filtered.length} materi tersedia</p>
            {filtered.map((m: any) => {
              const ext = getExt(m.file_name || '');
              const icon = FILE_ICON[ext] || '📚';
              return (
                <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 flex items-start gap-3">
                    {/* File icon */}
                    <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-xl">
                      {icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 leading-snug">{m.judul}</p>
                      {m.mata_pelajaran && (
                        <span className="inline-block text-[10px] font-semibold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded-full mt-1">
                          {m.mata_pelajaran.nama}
                        </span>
                      )}
                      {m.kelas && (
                        <span className="inline-block text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mt-1 ml-1">
                          {m.kelas.nama}
                        </span>
                      )}
                      {m.deskripsi && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{m.deskripsi}</p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      {m.guru && <span>oleh {m.guru.nama}</span>}
                      {m.file_size && <span>{fmtSize(m.file_size)}</span>}
                      <span>{fmtDate(m.created_at)}</span>
                    </div>
                    {m.file_url ? (
                      <a
                        href={`${API_BASE}${m.file_url}`}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F97316] text-white rounded-xl text-xs font-semibold"
                      >
                        <Download size={12} /> Unduh
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">Tanpa file</span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
