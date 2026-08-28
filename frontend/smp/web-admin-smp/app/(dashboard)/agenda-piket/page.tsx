'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function AgendaPiketAdminPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['agenda-piket-admin'],
    queryFn: () => api.get('/agenda-piket', { params: { limit: 100 } }).then((r: any) => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/agenda-piket/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda-piket-admin'] }),
  });

  const list: any[] = data?.data || [];

  return (
    <div>
      <Header title="Laporan Guru Piket" />
      <div className="p-6 max-w-4xl">
        {isLoading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
        {!isLoading && list.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <ClipboardList size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Belum ada laporan piket.</p>
          </div>
        )}
        <div className="space-y-3">
          {list.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 flex items-start justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                <div>
                  <p className="font-semibold text-[#1A2332] text-sm">
                    {a.tanggal ? new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Guru Piket: {a.guru?.user?.nama || '—'}</p>
                  <div className="flex gap-3 mt-1 text-xs">
                    {a.siswa_terlambat?.length > 0 && <span className="text-orange-500">⏰ {a.siswa_terlambat.length} siswa terlambat</span>}
                    {a.guru_tidak_masuk?.length > 0 && <span className="text-red-500">✗ {a.guru_tidak_masuk.length} guru tidak masuk</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); if (confirm('Hapus laporan ini?')) deleteMut.mutate(a.id); }}
                    className="text-gray-300 hover:text-red-400"><Trash2 size={16} /></button>
                  {expanded === a.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {expanded === a.id && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                  {a.keadaan_kbm && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Keadaan KBM</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.keadaan_kbm}</p>
                    </div>
                  )}
                  {a.siswa_terlambat?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-2">Siswa Terlambat</p>
                      <div className="space-y-1">
                        {a.siswa_terlambat.map((s: any, i: number) => (
                          <div key={i} className="flex gap-4 text-sm bg-orange-50 rounded-lg px-3 py-1.5">
                            <span className="font-medium">{s.nama}</span>
                            <span className="text-gray-500">{s.kelas}</span>
                            <span className="text-gray-400">{s.jam}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {a.guru_tidak_masuk?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">Guru Tidak Masuk</p>
                      <div className="space-y-1">
                        {a.guru_tidak_masuk.map((g: any, i: number) => (
                          <div key={i} className="flex gap-4 text-sm bg-red-50 rounded-lg px-3 py-1.5">
                            <span className="font-medium">{g.nama}</span>
                            <span className="text-gray-500">{g.mata_pelajaran}</span>
                            <span className="text-gray-400">{g.keterangan}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {a.catatan && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Catatan</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.catatan}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
