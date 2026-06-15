'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function OrangTuaPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['ortu', search, page],
    queryFn: () => api.get('/siswa', { params: { search, page, limit: 20, include_ortu: true } }).then(r => r.data),
  });

  const siswaList = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <Header title="Manajemen Orang Tua" />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Cari nama siswa / orang tua..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
          />
          <button className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] font-medium">
            + Tambah Orang Tua
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Nama Siswa</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kelas</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Orang Tua</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Hubungan</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">No. Telp</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Email Ortu</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : siswaList.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Tidak ada data</td></tr>
              ) : siswaList.map((s: any) => {
                const ortu = s.orangTua?.[0];
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-800">{s.user?.nama}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{s.kelas?.nama}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{ortu?.user?.nama || <span className="text-gray-300">-</span>}</td>
                    <td className="px-6 py-4 text-gray-500 capitalize">{ortu?.hubungan || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{ortu?.no_telp || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{ortu?.user?.email || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-[#3B7FD1] hover:underline text-xs">Edit</button>
                        {!ortu && <button className="text-green-600 hover:underline text-xs">+ Daftarkan</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
