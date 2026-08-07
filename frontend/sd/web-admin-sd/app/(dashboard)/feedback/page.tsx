'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const KATEGORI_LABEL: Record<string, string> = {
  pertanyaan: '❓ Pertanyaan',
  saran: '💡 Saran',
  fitur: '✨ Fitur',
  bug: '🐛 Bug',
};
const STATUS_STYLE: Record<string, string> = {
  baru:    'bg-blue-100 text-blue-700',
  dibaca:  'bg-yellow-100 text-yellow-700',
  dibalas: 'bg-green-100 text-green-700',
};
const SUMBER_LABEL: Record<string, string> = {
  'web-guru':  '🖥️ Guru',
  'web-admin': '⚙️ Admin',
  'app-siswa': '📱 Siswa',
  'app-ortu':  '👨‍👩‍👧 Ortu',
};

export default function FeedbackAdminPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKat, setFilterKat] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [balasan, setBalasan] = useState('');

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['feedback-admin', filterStatus, filterKat],
    queryFn: () => {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterKat) params.kategori = filterKat;
      return api.get('/feedback', { params }).then(r => r.data.data || []);
    },
    refetchInterval: 30000,
  });

  const balas = useMutation({
    mutationFn: () => api.put(`/feedback/${selected.id}/balas`, { balasan }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feedback-admin'] }); setSelected(null); setBalasan(''); },
  });

  const baca = useMutation({
    mutationFn: (id: string) => api.patch(`/feedback/${id}/baca`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-admin'] }),
  });

  const baru = (list as any[]).filter((f: any) => f.status === 'baru').length;

  return (
    <div>
      <Header title="Feedback & Saran" />
      <div className="p-6">

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          {baru > 0 && <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">{baru} baru</span>}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="">Semua Status</option>
            <option value="baru">Baru</option>
            <option value="dibaca">Dibaca</option>
            <option value="dibalas">Dibalas</option>
          </select>
          <select value={filterKat} onChange={e => setFilterKat(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="">Semua Kategori</option>
            <option value="pertanyaan">Pertanyaan</option>
            <option value="saran">Saran</option>
            <option value="fitur">Fitur</option>
            <option value="bug">Bug</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Memuat...</div>
          ) : (list as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400">Belum ada feedback</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">Pengirim</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">Kategori</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">Judul</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">Sumber</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">Tanggal</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(list as any[]).map((fb: any) => (
                  <tr key={fb.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-800">{fb.pengirim?.nama || '—'}</p>
                      <p className="text-xs text-gray-400">{fb.pengirim?.role}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs">{KATEGORI_LABEL[fb.kategori] || fb.kategori}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800 max-w-xs truncate">{fb.judul}</td>
                    <td className="px-5 py-3.5 text-xs">{SUMBER_LABEL[fb.sumber] || fb.sumber}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[fb.status] || 'bg-gray-100 text-gray-600'}`}>
                        {fb.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{new Date(fb.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => { setSelected(fb); setBalasan(fb.balasan || ''); if (fb.status === 'baru') baca.mutate(fb.id); }}
                        className="text-[#3B7FD1] hover:underline text-xs font-medium">Lihat & Balas</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal detail & balas */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-gray-400">{KATEGORI_LABEL[selected.kategori]} · {SUMBER_LABEL[selected.sumber]}</p>
                <h3 className="font-bold text-[#1A2332] text-lg mt-0.5">{selected.judul}</h3>
                <p className="text-xs text-gray-400">dari {selected.pengirim?.nama} · {new Date(selected.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.pesan}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Balasan Admin</label>
              <textarea value={balasan} onChange={e => setBalasan(e.target.value)} rows={4}
                placeholder="Tulis balasan untuk pengirim..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1] resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setSelected(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Tutup</button>
              <button onClick={() => balas.mutate()} disabled={!balasan || balas.isPending}
                className="flex-1 px-4 py-2.5 bg-[#3B7FD1] text-white rounded-xl text-sm font-bold hover:bg-[#2d6ab5] disabled:opacity-50">
                {balas.isPending ? 'Mengirim...' : 'Kirim Balasan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
