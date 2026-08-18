'use client';
import AuthImage from '@/components/AuthImage';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Image as ImageIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function CatatanSiswaAdminPage() {
  const [kelasId, setKelasId] = useState('');
  const [siswaId, setSiswaId] = useState('');

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-admin-cs'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-admin-cs', kelasId],
    queryFn: () => api.get(`/kelas/${kelasId}/siswa`).then(r => r.data.data || []),
    enabled: !!kelasId,
  });

  const { data: catatanData, isLoading } = useQuery({
    queryKey: ['catatan-admin', siswaId],
    queryFn: () => api.get('/catatan-siswa', { params: { siswa_id: siswaId, limit: 100 } }).then(r => r.data),
    enabled: !!siswaId,
  });

  const catatan: any[] = catatanData?.data || [];
  const siswaSelected = (siswaList as any[]).find((s: any) => s.id === siswaId);
  const kelasSelected = (kelasList as any[]).find((k: any) => k.id === kelasId);

  return (
    <div>
      <Header title="Monitoring Catatan Siswa" />
      <div className="p-6 max-w-3xl">

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Kelas</label>
              <select value={kelasId} onChange={e => { setKelasId(e.target.value); setSiswaId(''); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                <option value="">-- Pilih Kelas --</option>
                {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Siswa</label>
              <select value={siswaId} onChange={e => setSiswaId(e.target.value)}
                disabled={!kelasId}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] disabled:opacity-50">
                <option value="">-- Pilih Siswa --</option>
                {(siswaList as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.user?.nama || s.nama}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Info siswa terpilih */}
        {siswaSelected && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1B8B87]/10 flex items-center justify-center text-[#1B8B87] font-bold text-sm">
              {(siswaSelected.user?.nama || siswaSelected.nama || '?')[0]}
            </div>
            <div>
              <p className="font-semibold text-[#1A2332] text-sm">{siswaSelected.user?.nama || siswaSelected.nama}</p>
              <p className="text-xs text-gray-400">{kelasSelected?.nama} · {catatan.length} catatan</p>
            </div>
          </div>
        )}

        {/* Catatan list */}
        {isLoading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}

        {!isLoading && siswaId && catatan.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <FileText size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Belum ada catatan untuk siswa ini.</p>
          </div>
        )}

        {!siswaId && !isLoading && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-400 text-sm">Pilih kelas dan siswa untuk melihat catatan.</p>
          </div>
        )}

        <div className="space-y-3">
          {catatan.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-5 flex gap-4">
              {c.foto_url && (
                <AuthImage src={c.foto_url} alt="foto"
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-gray-100" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-400">
                      {c.tanggal ? new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                      {c.guru?.user?.nama ? ` · oleh ${c.guru.user.nama}` : ''}
                    </p>
                    {c.judul && <p className="text-xs font-semibold text-[#1B8B87] mt-0.5">{c.judul}</p>}
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.isi}</p>
                  </div>
                  {c.foto_url && !c.foto_url.includes('catatan') && (
                    <ImageIcon size={14} className="text-gray-300 flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
