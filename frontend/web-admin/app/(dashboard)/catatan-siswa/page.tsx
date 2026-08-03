'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, BookUser, TrendingUp, Calendar, BookOpen, Users } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const BADGE: Record<string, string> = {
  hadir: 'bg-green-100 text-green-700 border border-green-200',
  sakit: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  izin:  'bg-blue-100 text-blue-700 border border-blue-200',
  alfa:  'bg-red-100 text-red-700 border border-red-200',
};
const LABEL: Record<string, string> = { hadir: 'Hadir', sakit: 'Sakit', izin: 'Izin', alfa: 'Alfa' };

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

  const { data: riwayat, isLoading } = useQuery({
    queryKey: ['riwayat-siswa-admin', siswaId, kelasId],
    queryFn: () => api.get(`/jurnal-guru/siswa-riwayat/${siswaId}`, {
      params: kelasId ? { kelas_id: kelasId } : {},
    }).then(r => r.data),
    enabled: !!siswaId,
  });

  const siswaSelected = (siswaList as any[]).find((s: any) => s.id === siswaId);
  const kelasSelected = (kelasList as any[]).find((k: any) => k.id === kelasId);
  const stats = riwayat?.stats || { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
  const total = riwayat?.total || 0;
  const records: any[] = riwayat?.data || [];
  const pctHadir = total > 0 ? Math.round((stats.hadir / total) * 100) : 0;

  return (
    <div>
      <Header title="Monitoring Catatan Siswa" />
      <div className="p-6 max-w-4xl">

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Kelas</label>
              <div className="relative">
                <select value={kelasId} onChange={e => { setKelasId(e.target.value); setSiswaId(''); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] appearance-none bg-white pr-8">
                  <option value="">-- Semua Kelas --</option>
                  {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Siswa</label>
              <div className="relative">
                <select value={siswaId} onChange={e => setSiswaId(e.target.value)}
                  disabled={!kelasId}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] appearance-none bg-white pr-8 disabled:opacity-50">
                  <option value="">-- Pilih Siswa --</option>
                  {(siswaList as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.user?.nama || s.nama}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Profil siswa + stats */}
        {siswaSelected && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1B8B87]/10 flex items-center justify-center text-[#1B8B87] text-xl font-bold flex-shrink-0">
                {(siswaSelected.user?.nama || siswaSelected.nama || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{siswaSelected.user?.nama || siswaSelected.nama}</h2>
                <p className="text-sm text-gray-500">{kelasSelected?.nama} · NIS {siswaSelected.nis || '-'}</p>
              </div>
              {total > 0 && (
                <div className="text-right hidden sm:block">
                  <p className="text-2xl font-bold text-[#1B8B87]">{pctHadir}%</p>
                  <p className="text-xs text-gray-400">tingkat kehadiran</p>
                </div>
              )}
            </div>

            {total > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {(['hadir', 'sakit', 'izin', 'alfa'] as const).map(k => (
                  <div key={k} className="rounded-lg p-3 text-center"
                    style={{ backgroundColor: k === 'hadir' ? '#f0fdf4' : k === 'sakit' ? '#fefce8' : k === 'izin' ? '#eff6ff' : '#fef2f2' }}>
                    <p className="text-xl font-bold"
                      style={{ color: k === 'hadir' ? '#15803d' : k === 'sakit' ? '#a16207' : k === 'izin' ? '#1d4ed8' : '#b91c1c' }}>
                      {stats[k]}
                    </p>
                    <p className="text-xs font-medium mt-0.5"
                      style={{ color: k === 'hadir' ? '#15803d' : k === 'sakit' ? '#a16207' : k === 'izin' ? '#1d4ed8' : '#b91c1c' }}>
                      {LABEL[k]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Riwayat timeline */}
        {siswaId && (
          isLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <p className="text-gray-400 text-sm">Memuat riwayat...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <BookUser size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Belum ada catatan untuk siswa ini</p>
              <p className="text-xs text-gray-400 mt-1">Catatan muncul setelah guru mengisi jurnal detail siswa</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#1B8B87]" />
                <h3 className="font-semibold text-gray-800 text-sm">Riwayat Catatan ({total} pertemuan)</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {records.map((r: any, i: number) => {
                  const j = r.jurnal;
                  const tgl = j?.tanggal ? new Date(j.tanggal).toLocaleDateString('id-ID', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  }) : '-';
                  return (
                    <div key={r.id || i} className="px-5 py-4 hover:bg-gray-50/60 flex gap-4">
                      <div className="w-32 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <Calendar size={11} />{tgl}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Users size={11} />{j?.guru?.user?.nama || '-'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <BookOpen size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-800 truncate">{j?.mata_pelajaran?.nama || '-'}</span>
                        </div>
                        {j?.topik_pelajaran && j.topik_pelajaran !== '-' && (
                          <p className="text-xs text-gray-500 truncate">{j.topik_pelajaran}</p>
                        )}
                        {r.catatan && (
                          <p className="text-xs text-gray-600 mt-1.5 bg-yellow-50 border border-yellow-100 rounded px-2 py-1">{r.catatan}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-start pt-0.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE[r.kehadiran] || BADGE.hadir}`}>
                          {LABEL[r.kehadiran] || 'Hadir'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {!kelasId && (
          <div className="bg-white rounded-xl p-16 text-center shadow-sm">
            <BookUser size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Pilih kelas lalu siswa</p>
            <p className="text-xs text-gray-400 mt-1">untuk memonitor perkembangan dan catatan siswa dari semua guru</p>
          </div>
        )}
      </div>
    </div>
  );
}
