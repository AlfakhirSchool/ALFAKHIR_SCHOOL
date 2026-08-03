'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function NilaiAdminPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ kelas_id: '', mata_pelajaran_id: '', semester: '', tahun_ajaran: '' });
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [hapusInfo, setHapusInfo] = useState<string>('');

  const { data: kelasList } = useQuery({ queryKey: ['kelas-all'], queryFn: () => api.get('/kelas').then(r => r.data.data || []) });
  const { data: mapelList } = useQuery({ queryKey: ['mapel-all'], queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data || []) });

  const { data, isLoading } = useQuery({
    queryKey: ['nilai-laporan', filter],
    queryFn: () => api.get('/nilai/laporan', {
      params: {
        kelas_id: filter.kelas_id || undefined,
        mata_pelajaran_id: filter.mata_pelajaran_id || undefined,
        semester: filter.semester || undefined,
        tahun_ajaran: filter.tahun_ajaran || undefined,
      }
    }).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/nilai/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nilai-laporan'] }); setHapusId(null); },
  });

  const nilaiList = data?.data || [];
  const stats = data?.statistics || {};

  const gradeColor: Record<string, string> = {
    A: 'bg-green-50 text-green-700', B: 'bg-blue-50 text-blue-700',
    C: 'bg-yellow-50 text-yellow-700', D: 'bg-orange-50 text-orange-700', E: 'bg-red-50 text-red-700'
  };

  return (
    <div>
      <Header title="Data Nilai" />
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#3B7FD1]">
            <p className="text-sm text-gray-500">Rata-rata Kelas</p>
            <p className="text-xl font-bold text-[#3B7FD1]">{stats.rata_rata?.toFixed(1) || '-'}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Nilai Tertinggi</p>
            <p className="text-xl font-bold text-green-600">{stats.tertinggi || '-'}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-gray-500">Nilai Terendah</p>
            <p className="text-xl font-bold text-red-600">{stats.terendah || '-'}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Di Bawah KKM</p>
            <p className="text-xl font-bold text-yellow-600">{stats.bawah_kkm || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={filter.kelas_id} onChange={(e) => setFilter({ ...filter, kelas_id: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
            <option value="">Semua Kelas</option>
            {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <select value={filter.mata_pelajaran_id} onChange={(e) => setFilter({ ...filter, mata_pelajaran_id: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
            <option value="">Semua Mapel</option>
            {(mapelList || []).map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
          </select>
          <select value={filter.semester} onChange={(e) => setFilter({ ...filter, semester: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
            <option value="">Semua Semester</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
          <input value={filter.tahun_ajaran} onChange={(e) => setFilter({ ...filter, tahun_ajaran: e.target.value })}
            placeholder="Tahun Ajaran (2024/2025)"
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1] w-48" />
          <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Export Excel</button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Siswa</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kelas</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Mapel</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-700">Kuis</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-700">Tugas</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-700">UTS</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-700">UAS</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-700">Nilai Akhir</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-700">Grade</th>
                <th className="text-left px-4 py-4 font-semibold text-gray-700">Predikat</th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Memuat...</td></tr>
              ) : nilaiList.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Tidak ada data nilai</td></tr>
              ) : nilaiList.map((n: any) => (
                <tr key={n.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-800">{n.siswa?.user?.nama}</td>
                  <td className="px-6 py-4 text-gray-500">{n.siswa?.kelas?.nama}</td>
                  <td className="px-6 py-4 text-gray-500">{n.mataPelajaran?.nama}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{n.kuis ?? '-'}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{n.tugas ?? '-'}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{n.uts ?? '-'}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{n.uas ?? '-'}</td>
                  <td className="px-4 py-4 text-center font-bold text-[#3B7FD1]">{n.nilai_akhir}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${gradeColor[n.grade] || 'bg-gray-50 text-gray-600'}`}>{n.grade}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{n.predikat}</td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => { setHapusId(n.id); setHapusInfo(`${n.siswa?.user?.nama} — ${n.mataPelajaran?.nama}`); }}
                      className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Konfirmasi Hapus */}
      {hapusId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Hapus Data Nilai?</h3>
              <p className="text-sm text-gray-500 mt-1">{hapusInfo}</p>
              <p className="text-xs text-red-500 mt-2">Data yang dihapus tidak bisa dikembalikan.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setHapusId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Batal
              </button>
              <button onClick={() => deleteMut.mutate(hapusId)} disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
