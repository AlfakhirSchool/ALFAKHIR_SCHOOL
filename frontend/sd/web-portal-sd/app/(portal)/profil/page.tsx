'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Mail, LogOut, GraduationCap, ChevronRight, Settings, HelpCircle, Bell, Camera } from 'lucide-react';
import api from '@/lib/api';

export default function ProfilPage() {
  const { user, logout, login } = useAuthStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await api.post('/auth/upload-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data?.data?.profile_pic && user) {
        login({ ...user, profile_pic: res.data.data.profile_pic }, '', '');
      }
    } catch {
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const initial = (user?.nama || 'U')[0].toUpperCase();
  const roleLabel = user?.role === 'ortu' ? 'Orang Tua' : 'Siswa';
  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  const photoUrl = preview || (user?.profile_pic ? `${API_BASE}${user.profile_pic}` : null);

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #FF8C38 0%, #E8620D 100%)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/8" />
        <div className="absolute top-6 right-2 w-16 h-16 rounded-full bg-white/8" />

        <div className="px-4 pt-14 pb-10 flex flex-col items-center text-center relative">
          {/* Avatar + upload button */}
          <div className="relative mb-4">
            <div className="w-[88px] h-[88px] rounded-full border-4 border-white/30 bg-white/20 flex items-center justify-center overflow-hidden">
              {photoUrl
                ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-white font-black text-4xl">{initial}</span>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-white/50">
              <Camera size={13} className="text-[#F97316]" />
            </button>
            <div className="absolute top-0 left-0 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white" />
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>

          <h1 className="text-white font-black text-2xl leading-tight">{user?.nama || 'Pengguna'}</h1>
          <span className="mt-2 px-4 py-1 rounded-full bg-white/25 text-white text-xs font-bold tracking-wide">
            {roleLabel}
          </span>
          {uploading && <p className="text-white/60 text-[10px] mt-2">Mengupload foto...</p>}
        </div>

        <div className="h-7 bg-[#F0F2F5] rounded-t-[28px]" />
      </div>

      <div className="px-4 pb-28 space-y-3">

        {/* Info card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informasi Akun</p>
          </div>
          {[
            { icon: Mail, label: 'Email / Username', value: user?.email || '-' },
            { icon: GraduationCap, label: 'Peran', value: roleLabel },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="px-4 py-3.5 flex items-center gap-3 border-t border-gray-50">
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-[#F97316]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Menu card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pengaturan</p>
          </div>
          {[
            { icon: Bell,        label: 'Notifikasi',        sub: 'Atur preferensi notifikasi' },
            { icon: HelpCircle,  label: 'Bantuan',           sub: 'Hubungi admin sekolah' },
            { icon: Settings,    label: 'Pengaturan Akun',   sub: 'Password & privasi' },
          ].map(({ icon: Icon, label, sub }) => (
            <button key={label}
              className="w-full px-4 py-3.5 flex items-center gap-3 border-t border-gray-50 active:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-gray-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-400">{sub}</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full py-3.5 flex items-center justify-center gap-2.5 bg-white rounded-2xl shadow-sm text-red-500 font-semibold text-sm active:bg-red-50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
            <LogOut size={14} className="text-red-500" />
          </div>
          Keluar dari Akun
        </button>

        <p className="text-center text-[10px] text-gray-400 pb-2">
          Portal Al-Fakhir School v1.0 · Sawangan, Depok
        </p>
      </div>
    </div>
  );
}
