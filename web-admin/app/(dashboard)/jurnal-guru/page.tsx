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
  const [detail, setDetail] = useState<any>(null);
  const [dlLoading, setDlLoading] = useState(false);

  const downloadExcel = async () => {
    setDlLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const params = new URLSearchParams();
      if (filter.kelas_id) params.set('kelas_id', filter.kelas_id);
      if (filter.status) params.set('status', filter.status);
      if (filter.tanggal_awal) params.set('start_date', filter.tanggal_awal);
      const res = await fetch(`${base}/jurnal-guru/download/excel?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JurnalGuru_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Gagal download'); }
    finally { setDlLoading(false); }
  };

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
          <button onClick={downloadExcel} disabled={dlLoading}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-semibold hover:bg-[#2d6ab5] disabled:opacity-50 flex items-center gap-2">
            {dlLoading ? 'Mengunduh...' : 'Export Excel'}
          </button>
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
                  <td className="px-6 py-4 text-gray-500">{j.mata_pelajaran?.nama}</td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{j.topik_pelajaran}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(j.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[j.status] || ''}`}>{j.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setDetail(j)} className="text-[#3B7FD1] hover:underline text-xs">Detail</button>
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

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-semibold text-[#1A2332]">{detail.topik_pelajaran}</h2>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[detail.status]}`}>{detail.status}</span>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div><span className="font-medium block text-gray-500">Guru</span>{detail.guru?.user?.nama || '—'}</div>
                <div><span className="font-medium block text-gray-500">Kelas</span>{detail.kelas?.nama || '—'}</div>
                <div><span className="font-medium block text-gray-500">Mata Pelajaran</span>{detail.mata_pelajaran?.nama || '—'}</div>
                <div><span className="font-medium block text-gray-500">Tanggal</span>{new Date(detail.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              {detail.deskripsi_pembelajaran && (
                <div><p className="text-xs font-medium text-gray-500 mb-1">Tugas</p><p className="bg-gray-50 rounded-lg p-3 text-gray-700">{detail.deskripsi_pembelajaran}</p></div>
              )}
              {detail.hasil_pembelajaran && (
                <div><p className="text-xs font-medium text-gray-500 mb-1">Catatan Guru</p><p className="bg-gray-50 rounded-lg p-3 text-gray-700">{detail.hasil_pembelajaran}</p></div>
              )}
              {detail.rencana_tindak_lanjut && (
                <div><p className="text-xs font-medium text-gray-500 mb-1">Rencana Tindak Lanjut</p><p className="bg-gray-50 rounded-lg p-3 text-gray-700">{detail.rencana_tindak_lanjut}</p></div>
              )}
              {detail.status === 'submitted' && (
                <button
                  onClick={() => { approveJurnal.mutate(detail.id); setDetail(null); }}
                  className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  Approve Jurnal
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
