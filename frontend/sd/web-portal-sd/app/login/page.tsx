'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email: username, password });
      const { user, accessToken, refreshToken } = res.data;
      if (!['siswa', 'ortu'].includes(user.role)) {
        setError('Akun ini tidak memiliki akses ke portal siswa/orang tua.');
        return;
      }
      login(user, accessToken, refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Email/password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F97316] to-[#0f4a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Judul */}
        <div className="text-center mb-8">
          <img src="/logo-sd.png" alt="Logo SD" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-white">Portal SD Al-Fakhir</h1>
          <p className="text-orange-200 text-sm mt-1">SD Islam Modern Al-Fakhir</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Masuk ke Portal</h2>
          <p className="text-sm text-gray-500 mb-6">Untuk orang tua & siswa</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email / Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="email@sekolah.sch.id"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#F97316] text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#ea6b10] disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={16} /> Masuk</>
              )}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400 mt-5">
            Lupa password? Hubungi admin sekolah.
          </p>
        </div>

        <p className="text-center text-orange-300 text-xs mt-6">
          © 2025 Al-Fakhir School · Sawangan, Depok
        </p>
      </div>
    </div>
  );
}
