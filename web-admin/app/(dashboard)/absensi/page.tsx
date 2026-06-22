'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function AbsensiAdminPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ kelas_id: '', tanggal_awal: '', tanggal_akhir: '', status: '' });
  const [page, setPage] = useState(1);
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [hapusInfo, setHapusInfo] = useState<string>('');

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-all'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['absensi-laporan', filter, page],
    queryFn: () => api.get('/absensi/laporan', {
      params: { ...filter, page, limit: 30, kelas_id: filter.kelas_id || undefined, status: filter.status || undefined }
    }).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/absensi/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['absensi-laporan'] }); setHapusId(null); },
  });

  const absensiList = data?.data || [];
  const summary = data?.summary || {};

  return (
    <div>
      <Header title="Data Absensi" />
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Hadir</p>
            <p className="text-xl font-bold text-green-600">{summary.hadir || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Sakit</p>
            <p className="text-xl font-bold text-blue-600">{summary.sakit || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Izin</p>
            <p className="text-xl font-bold text-yellow-600">{summary.izin || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-gray-500">Alfa</p>
            <p className="text-xl font-bold text-red-600">{summary.alfa || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={filter.kelas_id} onChange={(e) => setFilter({ ...filter, kelas_id: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
            <option value="">Semua Kelas</option>
            {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <input type="date" value={filter.tanggal_awal} onChange={(e) => setFilter({ ...filter, tanggal_awal: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]" />
          <input type="date" value={filter.tanggal_akhir} onChange={(e) => setFilter({ ...filter, tanggal_akhir: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]" />
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
            <option value="">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="sakit">Sakit</option>
            <option value="izin">Izin</option>
            <option value="alfa">Alfa</option>
          </select>
          <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Export Excel</button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Siswa</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kelas</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Mata Pelajaran</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Tanggal</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Jam Hadir</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Metode</th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Memuat...</td></tr>
              ) : absensiList.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Tidak ada data absensi</td></tr>
              ) : absensiList.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-800">{a.siswa?.user?.nama}</td>
                  <td className="px-6 py-4 text-gray-500">{a.jadwalPelajaran?.kelas?.nama}</td>
                  <td className="px-6 py-4 text-gray-500">{a.jadwalPelajaran?.mataPelajaran?.nama}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(a.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4 text-gray-500">{a.waktu_hadir ? new Date(a.waktu_hadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      a.status === 'hadir' ? 'bg-green-50 text-green-700' :
                      a.status === 'sakit' ? 'bg-blue-50 text-blue-700' :
                      a.status === 'izin' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>{a.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {a.qr_code_scanned ? 'QR Scan' : a.input_code ? 'Kode Manual' : 'Manual'}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => { setHapusId(a.id); setHapusInfo(`${a.siswa?.user?.nama} — ${new Date(a.tanggal).toLocaleDateString('id-ID')}`); }}
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
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Hapus Data Absensi?</h3>
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
