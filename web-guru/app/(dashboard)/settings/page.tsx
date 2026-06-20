'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [photoMsg, setPhotoMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build absolute URL: strip /api suffix, then prepend to relative path
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
  const profilePicUrl = user?.profile_pic
    ? user.profile_pic.startsWith('http')
      ? user.profile_pic
      : `${apiBase}${user.profile_pic}`
    : null;

  const uploadPhoto = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.post('/auth/upload-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      const pic = res.data?.data?.profile_pic;
      if (pic) updateUser({ profile_pic: pic });
      setPhotoMsg('Foto profil berhasil diperbarui');
      setTimeout(() => setPhotoMsg(''), 3000);
    },
    onError: () => {
      setPhotoMsg('Gagal mengupload foto');
      setTimeout(() => setPhotoMsg(''), 3000);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto.mutate(file);
    e.target.value = '';
  };

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
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full overflow-hidden cursor-pointer bg-[#1B8B87] flex items-center justify-center text-white text-2xl font-bold border-2 border-[#1B8B87] hover:opacity-90 transition-opacity"
              >
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Foto profil" className="w-full h-full object-cover" />
                ) : (
                  user?.nama?.charAt(0)
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPhoto.isPending}
                className="absolute bottom-0 right-0 bg-[#1B8B87] rounded-full p-1.5 border-2 border-white text-white hover:bg-[#156f6c] transition-colors"
              >
                {uploadPhoto.isPending ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div>
              <p className="font-semibold text-[#1A2332] text-lg">{user?.nama}</p>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <span className="text-xs bg-[#1B8B87]/10 text-[#1B8B87] px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{user?.role}</span>
              {photoMsg && (
                <p className={`text-xs mt-2 ${photoMsg.includes('berhasil') ? 'text-green-600' : 'text-red-500'}`}>{photoMsg}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Klik foto untuk mengubah foto profil (maks 5MB)</p>
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
