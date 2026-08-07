'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, LogOut, Shield } from 'lucide-react';

export default function ProfilPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">Profil</h1>

      {/* Avatar & nama */}
      <div className="bg-gradient-to-r from-[#F97316] to-[#ea6b10] rounded-2xl p-6 text-white text-center">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
          {(user?.nama || 'U')[0].toUpperCase()}
        </div>
        <p className="text-lg font-bold">{user?.nama}</p>
        <p className="text-orange-200 text-sm mt-0.5 capitalize">{user?.role === 'ortu' ? 'Orang Tua' : 'Siswa'}</p>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <Mail size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm text-gray-800">{user?.email || '-'}</p>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <Shield size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Role</p>
            <p className="text-sm text-gray-800 capitalize">{user?.role === 'ortu' ? 'Orang Tua' : 'Siswa'}</p>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <User size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Nama Lengkap</p>
            <p className="text-sm text-gray-800">{user?.nama}</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 flex items-center justify-center gap-2 text-red-500 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
      >
        <LogOut size={16} /> Keluar
      </button>

      <p className="text-center text-xs text-gray-400 pb-2">
        Portal Al-Fakhir School v1.0 · Sawangan, Depok
      </p>
    </div>
  );
}
