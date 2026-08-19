'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [namaForm, setNamaForm] = useState({ new_nama: '' });
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState('');
  const [namaMsg, setNamaMsg] = useState('');

  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ['my-pending'],
    queryFn: () => api.get('/pending-changes/mine').then(r => r.data.data || []),
  });
  const pending: any[] = pendingData || [];


  const requestPassword = useMutation({
    mutationFn: () => api.post('/pending-changes/request', {
      type: 'password',
      new_value: pwForm.new_password,
      current_password: pwForm.current_password,
    }),
    onSuccess: (r: any) => {
      setMsg(r.data.message);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      refetchPending();
    },
    onError: (e: any) => setMsg(e.response?.data?.message || 'Gagal mengirim permintaan'),
  });

  const requestNama = useMutation({
    mutationFn: () => api.post('/pending-changes/request', {
      type: 'nama',
      new_value: namaForm.new_nama,
    }),
    onSuccess: (r: any) => {
      setNamaMsg(r.data.message);
      setNamaForm({ new_nama: '' });
      refetchPending();
    },
    onError: (e: any) => setNamaMsg(e.response?.data?.message || 'Gagal mengirim permintaan'),
  });

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setMsg('Konfirmasi password tidak cocok');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setMsg('Password baru minimal 6 karakter');
      return;
    }
    requestPassword.mutate();
  };

  const handleNamaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaForm.new_nama.trim()) {
      setNamaMsg('Nama baru wajib diisi');
      return;
    }
    requestNama.mutate();
  };

  const statusIcon = (s: string) => {
    if (s === 'pending') return <Clock size={14} className="text-yellow-500" />;
    if (s === 'approved') return <CheckCircle size={14} className="text-green-500" />;
    return <XCircle size={14} className="text-red-500" />;
  };

  const statusLabel = (s: string) => s === 'pending' ? 'Menunggu' : s === 'approved' ? 'Disetujui' : 'Ditolak';

  return (
    <div>
      <Header title="Pengaturan" />

      <div className="p-6 max-w-2xl space-y-6">

        {/* Profil */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[#1A2332] mb-4">Profil Saya</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#1B8B87] flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg outline outline-2 outline-[#1B8B87]">
              {user?.nama?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-[#1A2332] text-lg">{user?.nama}</p>
              <p className="text-gray-500 text-sm">{user?.username}</p>
              <span className="text-xs bg-[#1B8B87]/10 text-[#1B8B87] px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Info approval */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Ubah Nama & Password memerlukan persetujuan Admin Master</p>
          <p className="text-xs text-amber-700">Permintaan akan dikirim ke Admin Master (Feri) untuk disetujui terlebih dahulu sebelum perubahan diterapkan.</p>
        </div>

        {/* Ubah Nama */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[#1A2332] mb-4">Ubah Nama</h2>
          {namaMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${namaMsg.includes('berhasil') || namaMsg.includes('dikirim') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {namaMsg}
            </div>
          )}
          <form onSubmit={handleNamaSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Baru</label>
              <input type="text" value={namaForm.new_nama}
                onChange={e => setNamaForm({ new_nama: e.target.value })}
                placeholder={user?.nama || 'Nama baru'}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]" />
            </div>
            <button type="submit" disabled={requestNama.isPending}
              className="px-6 py-2.5 bg-[#1B8B87] text-white rounded-lg font-medium hover:bg-[#156f6c] disabled:opacity-50">
              {requestNama.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
            </button>
          </form>
        </div>

        {/* Ubah Password */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[#1A2332] mb-4">Ubah Password</h2>
          {msg && (
            <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.includes('berhasil') || msg.includes('dikirim') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          )}
          <form onSubmit={handlePwSubmit} className="space-y-4">
            {([
              { label: 'Password Saat Ini', key: 'current_password', ph: '••••••••' },
              { label: 'Password Baru', key: 'new_password', ph: 'Min. 6 karakter' },
              { label: 'Konfirmasi Password Baru', key: 'confirm', ph: '••••••••' },
            ] as const).map(({ label, key, ph }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="relative">
                  <input type={showPw[key] ? 'text' : 'password'} value={pwForm[key]}
                    onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
                    placeholder={ph} />
                  <button type="button" onClick={() => setShowPw(v => ({ ...v, [key]: !v[key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={requestPassword.isPending}
              className="px-6 py-2.5 bg-[#1B8B87] text-white rounded-lg font-medium hover:bg-[#156f6c] disabled:opacity-50">
              {requestPassword.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
            </button>
          </form>
        </div>

        {/* Riwayat permintaan */}
        {pending.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-[#1A2332] mb-4">Riwayat Permintaan</h2>
            <div className="space-y-2">
              {pending.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    {statusIcon(p.status)}
                    <span className="font-medium capitalize">{p.type === 'password' ? 'Ubah Password' : 'Ubah Nama'}</span>
                    {p.type === 'nama' && <span className="text-gray-500">→ {p.new_value}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {p.catatan && <span className="text-xs text-gray-500 italic">{p.catatan}</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      p.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>{statusLabel(p.status)}</span>
                    <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
