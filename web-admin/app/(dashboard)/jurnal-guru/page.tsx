'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-50 text-blue-700',
  reviewed: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
};

export default function JurnalGuruAdminPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ kelas_id: '', status: '', tanggal_awal: '' });
  const [page, setPage] = useState(1);

  const { data: kelasList } = useQuery({ queryKey: ['kelas-all'], queryFn: () => api.get('/kelas').then(r => r.data.data || []) });

  const { data, isLoading } = useQuery({
    queryKey: ['jurnal-admin', filter, page],
    queryFn: () => api.get('/jurnal-guru', {
      params: { ...filter, page, limit: 20, kelas_id: filter.kelas_id || undefined, status: filter.status || undefined }
    }).then(r => r.data),
  });

  const jurnalList = data?.data || [];
  const summary = data?.summary || {};
  const pagination = data?.pagination || {};

  const approveJurnal = useMutation({
    mutationFn: (id: string) => api.post(`/jurnal-guru/${id}/review`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jurnal-admin'] }),
  });

  return (
    <div>
      <Header title="Monitoring Jurnal Guru" />
      <div className="p-6">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-gray-400">
            <p className="text-sm text-gray-500">Draft</p>
            <p className="text-xl font-bold text-gray-600">{summary.draft || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Submitted</p>
            <p className="text-xl font-bold text-blue-600">{summary.submitted || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Reviewed</p>
            <p className="text-xl font-bold text-yellow-600">{summary.reviewed || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-xl font-bold text-green-600">{summary.approved || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={filter.kelas_id} onChange={(e) => setFilter({ ...filter, kelas_id: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
            <option value="">Semua Kelas</option>
            {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
          </select>
          <input type="date" value={filter.tanggal_awal} onChange={(e) => setFilter({ ...filter, tanggal_awal: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]" />
          <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Export Excel</button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Guru</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kelas</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Mata Pelajaran</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Topik</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Tanggal</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat...</td></tr>
              ) : jurnalList.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Tidak ada data jurnal</td></tr>
              ) : jurnalList.map((j: any) => (
                <tr key={j.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-800">{j.guru?.user?.nama}</td>
                  <td className="px-6 py-4 text-gray-500">{j.kelas?.nama}</td>
                  <td className="px-6 py-4 text-gray-500">{j.mataPelajaran?.nama}</td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{j.topik_pelajaran}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(j.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[j.status] || ''}`}>{j.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-[#3B7FD1] hover:underline text-xs">Detail</button>
                      {j.status === 'submitted' && (
                        <button onClick={() => approveJurnal.mutate(j.id)}
                          className="text-green-600 hover:underline text-xs">
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Halaman {page} dari {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Prev</button>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
