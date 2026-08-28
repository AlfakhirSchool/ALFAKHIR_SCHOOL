'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const KATEGORI = [
  { value: 'pertanyaan', label: '❓ Pertanyaan', desc: 'Ada yang ingin ditanyakan?' },
  { value: 'saran',      label: '💡 Saran',      desc: 'Ide untuk meningkatkan sistem' },
  { value: 'fitur',      label: '✨ Tambahan Fitur', desc: 'Fitur baru yang dibutuhkan' },
  { value: 'bug',        label: '🐛 Laporan Bug', desc: 'Ada yang tidak berfungsi?' },
];

const STATUS_STYLE: Record<string, string> = {
  baru:    'bg-blue-50 text-blue-700',
  dibaca:  'bg-yellow-50 text-yellow-700',
  dibalas: 'bg-green-50 text-green-700',
};

export default function FeedbackPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ kategori: 'saran', judul: '', pesan: '' });
  const [sent, setSent] = useState(false);

  const { data: myFeedback = [] } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get('/feedback/mine').then((r: any) => r.data.data || []),
  });

  const send = useMutation({
    mutationFn: () => api.post('/feedback', { ...form, sumber: 'web-guru' }),
    onSuccess: () => {
      setSent(true);
      setForm({ kategori: 'saran', judul: '', pesan: '' });
      qc.invalidateQueries({ queryKey: ['my-feedback'] });
      setTimeout(() => setSent(false), 4000);
    },
  });

  return (
    <div>
      <Header title="Saran & Pertanyaan" />
      <div className="p-6 max-w-2xl space-y-6">

        {/* Form kirim */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[#1A2332] mb-1">Kirim ke Admin Master</h2>
          <p className="text-xs text-gray-400 mb-5">Pertanyaan, saran, atau usulan fitur baru akan langsung diterima oleh Admin</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {KATEGORI.map(k => (
              <button key={k.value} onClick={() => setForm(f => ({ ...f, kategori: k.value }))}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${form.kategori === k.value ? 'border-[#1B8B87] bg-teal-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <p className="font-semibold text-sm">{k.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.desc}</p>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Judul *</label>
              <input value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))}
                placeholder="Ringkasan singkat..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Pesan *</label>
              <textarea value={form.pesan} onChange={e => setForm(f => ({ ...f, pesan: e.target.value }))}
                rows={5} placeholder="Tulis detail pesan di sini..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] resize-none" />
            </div>
          </div>

          {sent && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg mt-3">✅ Pesan berhasil dikirim ke Admin Master!</p>}
          {(send.error as any) && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{(send.error as any)?.response?.data?.message || 'Gagal mengirim'}</p>}

          <button onClick={() => send.mutate()} disabled={!form.judul || !form.pesan || send.isPending}
            className="mt-4 px-6 py-2.5 bg-[#1B8B87] text-white rounded-lg text-sm font-semibold hover:bg-[#156f6c] disabled:opacity-50">
            {send.isPending ? 'Mengirim...' : 'Kirim Pesan'}
          </button>
        </div>

        {/* Riwayat */}
        {(myFeedback as any[]).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-[#1A2332] mb-4">Riwayat Pesan Saya</h2>
            <ul className="space-y-3">
              {(myFeedback as any[]).map((fb: any) => (
                <li key={fb.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm text-gray-800">{fb.judul}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[fb.status] || 'bg-gray-100 text-gray-600'}`}>
                      {fb.status === 'baru' ? 'Terkirim' : fb.status === 'dibaca' ? 'Dibaca' : 'Dibalas'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{KATEGORI.find(k => k.value === fb.kategori)?.label} · {new Date(fb.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="text-sm text-gray-600">{fb.pesan}</p>
                  {fb.balasan && (
                    <div className="mt-3 bg-teal-50 rounded-lg p-3 border-l-4 border-[#1B8B87]">
                      <p className="text-xs font-semibold text-[#1B8B87] mb-1">Balasan Admin:</p>
                      <p className="text-sm text-gray-700">{fb.balasan}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
