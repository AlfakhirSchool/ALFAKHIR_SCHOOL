'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'system'>('profile');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', {
      currentPassword: pwForm.current_password,
      newPassword: pwForm.new_password,
    }),
    onSuccess: () => { setMsg('Password berhasil diubah'); setPwForm({ current_password: '', new_password: '', confirm: '' }); },
    onError: (e: any) => setMsg(e.response?.data?.message || 'Gagal'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { setMsg('Konfirmasi tidak cocok'); return; }
    changePassword.mutate();
  };

  return (
    <div>
      <Header title="Pengaturan Sistem" />
      <div className="p-6 max-w-3xl">
        <div className="flex gap-2 mb-6">
          {(['profile', 'password', 'system'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${activeTab === t ? 'bg-[#3B7FD1] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t === 'profile' ? 'Profil' : t === 'password' ? 'Password' : 'Sistem'}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-[#1A2332] mb-6">Profil Admin</h2>
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 bg-[#3B7FD1] rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user?.nama?.charAt(0)}
              </div>
              <div>
                <p className="text-xl font-semibold text-[#1A2332]">{user?.nama}</p>
                <p className="text-gray-500">{user?.email}</p>
                <span className="text-xs bg-[#3B7FD1]/10 text-[#3B7FD1] px-2 py-0.5 rounded-full mt-1 inline-block">Administrator</span>
              </div>
            </div>
            <p className="text-sm text-gray-400">Untuk mengubah nama/email, hubungi developer sistem.</p>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-[#1A2332] mb-6">Ubah Password</h2>
            {msg && (
              <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {msg}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Password Saat Ini', key: 'current_password' },
                { label: 'Password Baru', key: 'new_password' },
                { label: 'Konfirmasi Password Baru', key: 'confirm' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="password" value={(pwForm as any)[key]}
                    onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
                    placeholder="••••••••" minLength={key === 'current_password' ? undefined : 8} />
                </div>
              ))}
              <button type="submit" disabled={changePassword.isPending}
                className="px-6 py-2.5 bg-[#3B7FD1] text-white rounded-lg font-medium hover:bg-[#2d6ab5] disabled:opacity-50">
                {changePassword.isPending ? 'Menyimpan...' : 'Ubah Password'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-[#1A2332] mb-4">Informasi Sistem</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Aplikasi', value: 'Al Fakhir LMS v1.0' },
                  { label: 'Environment', value: process.env.NODE_ENV || 'production' },
                  { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-[#1A2332] mb-4">Backup & Data</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-between">
                  <span>Export semua data (JSON)</span>
                  <span className="text-[#3B7FD1]">Download →</span>
                </button>
                <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-between">
                  <span>Status backup terakhir</span>
                  <span className="text-green-600 text-xs">✅ Normal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
