'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Bell, Camera, ChevronRight, LogOut, Shield, HelpCircle, BookOpen, Phone, GraduationCap } from 'lucide-react';
import api from '@/lib/api';

export default function ProfilPage() {
  const { user, logout, login } = useAuthStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: siswaData } = useQuery({
    queryKey: ['profil-siswa-me'],
    queryFn: () => api.get('/siswa/me').then(r => r.data.data),
    enabled: user?.role === 'siswa',
  });

  const nisDisplay = siswaData?.nis || user?.nis || user?.username || '-';
  const kelasNama = siswaData?.kelas?.nama || '-';

  const handleLogout = () => { logout(); router.push('/login'); };

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
    } catch { setPreview(null); }
    finally { setUploading(false); }
  };

  const initial = (user?.nama || 'U')[0].toUpperCase();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || '';
  const photoUrl = preview || (user?.profile_pic ? `${API_BASE}${user.profile_pic}` : null);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e9e0d8] h-[60px] flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ffdbc8] flex items-center justify-center">
            <GraduationCap size={16} className="text-[#994700]" />
          </div>
          <span className="font-black text-[#191c1e] text-sm tracking-wide">SD AL-FAKHIR</span>
        </div>
        <button className="w-9 h-9 rounded-full bg-[#ffdbc8]/50 flex items-center justify-center">
          <Bell size={18} className="text-[#994700]" />
        </button>
      </header>

      <div className="pt-[60px] pb-28">

        {/* Avatar section */}
        <div className="bg-white px-4 py-6 flex flex-col items-center border-b border-[#e9e0d8]">
          <div className="relative mb-4">
            <div className="w-[88px] h-[88px] rounded-full bg-[#ffdbc8] flex items-center justify-center overflow-hidden shadow-md">
              {photoUrl
                ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-[#994700] font-black text-4xl">{initial}</span>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#f47b20] flex items-center justify-center shadow-md border-2 border-white">
              <Camera size={14} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>

          <h1 className="font-black text-[#191c1e] text-xl leading-tight text-center">{user?.nama || 'Pengguna'}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[#565e74] font-medium">NIS {nisDisplay}</span>
            <span className="text-[#dec1b1]">·</span>
            <span className="text-xs text-[#565e74] font-medium">Kelas {kelasNama}</span>
          </div>
          <div className="mt-2.5 px-3 py-1 rounded-full bg-[#ecfdf5] flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">Aktif</span>
          </div>
          {uploading && <p className="text-[10px] text-[#565e74] mt-2">Mengupload foto...</p>}
        </div>

        <div className="px-4 py-4 space-y-3">

          {/* Informasi Akun */}
          <div>
            <p className="text-[11px] font-bold text-[#565e74] uppercase tracking-widest mb-2 px-1">Informasi Akun</p>
            <div className="bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] overflow-hidden divide-y divide-[#f5ede7]">
              {[
                { icon: BookOpen, label: 'Data Diri', sub: `NIS: ${nisDisplay}`, iconBg: '#ffdbc8', iconColor: '#994700' },
                { icon: Phone, label: 'Kontak Wali', sub: 'Info kontak orang tua', iconBg: '#dae2fd', iconColor: '#3b5bdb' },
                { icon: GraduationCap, label: 'Riwayat Akademik', sub: `Kelas ${kelasNama}`, iconBg: '#ecfdf5', iconColor: '#059669' },
              ].map(({ icon: Icon, label, sub, iconBg, iconColor }) => (
                <button key={label} className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#fdf6f1] transition-colors">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                    <Icon size={17} style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[#191c1e]">{label}</p>
                    <p className="text-[11px] text-[#8b7265]">{sub}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#dec1b1] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Pengaturan */}
          <div>
            <p className="text-[11px] font-bold text-[#565e74] uppercase tracking-widest mb-2 px-1">Pengaturan</p>
            <div className="bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] overflow-hidden divide-y divide-[#f5ede7]">
              {[
                { icon: Shield, label: 'Keamanan', sub: 'Password & privasi', iconBg: '#f5f3ff', iconColor: '#7c3aed' },
                { icon: Bell, label: 'Notifikasi', sub: 'Atur preferensi notifikasi', iconBg: '#fef9c3', iconColor: '#ca8a04' },
                { icon: HelpCircle, label: 'Pusat Bantuan', sub: 'Hubungi admin sekolah', iconBg: '#e0f2fe', iconColor: '#0284c7' },
              ].map(({ icon: Icon, label, sub, iconBg, iconColor }) => (
                <button key={label} className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#fdf6f1] transition-colors">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                    <Icon size={17} style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[#191c1e]">{label}</p>
                    <p className="text-[11px] text-[#8b7265]">{sub}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#dec1b1] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout}
            className="w-full bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] px-4 py-4 flex items-center gap-3 active:bg-red-50 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <LogOut size={17} className="text-red-500" />
            </div>
            <span className="text-sm font-semibold text-red-500">Keluar dari Akun</span>
          </button>

          <p className="text-center text-[10px] text-[#8b7265] pb-2">
            Portal Al-Fakhir School v1.0 · Sawangan, Depok
          </p>
        </div>
      </div>
    </div>
  );
}
