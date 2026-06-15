'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', {
      currentPassword: pwForm.current_password,
      newPassword: pwForm.new_password,
    }),
    onSuccess: () => {
      setMsg('Password berhasil diubah');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    },
    onError: (e: any) => setMsg(e.response?.data?.message || 'Gagal mengubah password'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setMsg('Konfirmasi password tidak cocok');
      return;
    }
    changePassword.mutate();
  };

  return (
    <div>
      <Header title="Pengaturan" />
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-[#1A2332] mb-4">Profil Saya</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#1B8B87] rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.nama?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-[#1A2332] text-lg">{user?.nama}</p>
              <p className="text-gray-500">{user?.email}</p>
              <span className="text-xs bg-[#1B8B87]/10 text-[#1B8B87] px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[#1A2332] mb-4">Ubah Password</h2>
          {msg && (
            <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
              <input type="password" value={pwForm.current_password}
                onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
                placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
              <input type="password" value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
                placeholder="Min. 8 karakter" minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
              <input type="password" value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={changePassword.isPending}
              className="px-6 py-2.5 bg-[#1B8B87] text-white rounded-lg font-medium hover:bg-[#156f6c] disabled:opacity-50">
              {changePassword.isPending ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
