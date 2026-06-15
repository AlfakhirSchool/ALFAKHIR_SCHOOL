'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function SiswaPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['siswa', search, page],
    queryFn: () => api.get('/siswa', { params: { search, page, limit: 20 } }).then(r => r.data),
  });

  const siswaList = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <Header title="Manajemen Siswa" />
      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
          />
          <button className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] transition-colors font-medium">
            + Tambah Siswa
          </button>
          <button className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Import CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Nama</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">NISN</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kelas</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Email</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : siswaList.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Tidak ada data siswa</td></tr>
              ) : siswaList.map((siswa: any) => (
                <tr key={siswa.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#3B7FD1]/10 rounded-full flex items-center justify-center text-[#3B7FD1] font-bold text-sm">
                        {siswa.user?.nama?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{siswa.user?.nama}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{siswa.nisn}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {siswa.kelas?.nama}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{siswa.user?.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      siswa.user?.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {siswa.user?.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-[#3B7FD1] hover:underline text-xs">Edit</button>
                      <button className="text-red-500 hover:underline text-xs">Nonaktifkan</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Menampilkan {siswaList.length} dari {pagination.total} siswa
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="px-3 py-1 bg-[#3B7FD1] text-white rounded text-sm">{page}</span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-40"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
