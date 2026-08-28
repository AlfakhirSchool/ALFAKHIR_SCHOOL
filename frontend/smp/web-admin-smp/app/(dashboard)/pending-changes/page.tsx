'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function PendingChangesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isMaster = !user?.school_level;

  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState<any>(null);
  const [catatan, setCatatan] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['pending-changes', statusFilter],
    queryFn: () => api.get('/pending-changes', { params: { status: statusFilter } }).then((r: any) => r.data.data || []),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.put(`/pending-changes/${id}/review`, { action, catatan }).then((r: any) => r.data),
    onSuccess: (d: any) => {
      showFeedback('success', d.message);
      setReviewModal(null);
      setCatatan('');
      qc.invalidateQueries({ queryKey: ['pending-changes'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal memproses'),
  });

  const items: any[] = data || [];

  const statusBadge = (s: string) => {
    if (s === 'pending') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock size={11} />Menunggu</span>;
    if (s === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={11} />Disetujui</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><XCircle size={11} />Ditolak</span>;
  };

  if (!isMaster) {
    return (
      <div>
        <Header title="Permintaan Perubahan" />
        <div className="p-6 text-gray-500 text-sm">Fitur ini hanya untuk Admin Master.</div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Permintaan Perubahan" />
      <div className="p-6 space-y-5">

        {feedback && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
            <span>{feedback.type === 'success' ? '✓' : '✕'}</span> {feedback.msg}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold">Permintaan Ubah Password / Nama dari Guru & Siswa</p>
          <p className="text-xs mt-1 text-amber-700">Setujui atau tolak perubahan yang diminta. Jika disetujui, perubahan langsung diterapkan ke akun pengguna.</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak'], ['all', 'Semua']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === val ? 'bg-[#1B8B87] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {isLoading && <div className="bg-white rounded-xl p-12 text-center text-gray-400">Memuat...</div>}

        {!isLoading && items.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 border border-gray-100">
            Tidak ada permintaan
          </div>
        )}

        {items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pengguna</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipe</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nilai Baru</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Catatan</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1A2332]">{item.requester?.nama || '—'}</p>
                      <p className="text-xs text-gray-400">{(item.requester?.username || '')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.type === 'password' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {item.type === 'password' ? 'Password' : 'Nama'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.type === 'password' ? '••••••' : item.new_value}
                    </td>
                    <td className="px-4 py-3">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">{item.catatan || '—'}</td>
                    <td className="px-4 py-3">
                      {item.status === 'pending' && (
                        <button onClick={() => { setReviewModal(item); setCatatan(''); }}
                          className="px-3 py-1.5 bg-[#1B8B87] text-white rounded-lg text-xs font-medium hover:bg-[#156f6c]">
                          Proses
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-[#1A2332] text-lg mb-4">Proses Permintaan</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-1">
                <p><span className="text-gray-500">Dari:</span> <strong>{reviewModal.requester?.nama}</strong></p>
                <p><span className="text-gray-500">Tipe:</span> {reviewModal.type === 'password' ? 'Ubah Password' : 'Ubah Nama'}</p>
                {reviewModal.type === 'nama' && (
                  <p><span className="text-gray-500">Nama baru:</span> <strong>{reviewModal.new_value}</strong></p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <input type="text" value={catatan} onChange={e => setCatatan(e.target.value)}
                  placeholder="Alasan penolakan, dll."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => reviewMut.mutate({ id: reviewModal.id, action: 'approve' })}
                  disabled={reviewMut.isPending}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Setujui
                </button>
                <button onClick={() => reviewMut.mutate({ id: reviewModal.id, action: 'reject' })}
                  disabled={reviewMut.isPending}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  <XCircle size={16} /> Tolak
                </button>
                <button onClick={() => setReviewModal(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
