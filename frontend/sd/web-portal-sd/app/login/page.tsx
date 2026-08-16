'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      const { user, accessToken, refreshToken, profile_detail } = res.data.data;
      if (!['siswa', 'ortu'].includes(user.role)) {
        setError('Akun ini tidak memiliki akses ke portal siswa/orang tua.');
        return;
      }
      const enrichedUser = { ...user, nis: profile_detail?.nis || user.username || user.email };
      login(enrichedUser, accessToken, refreshToken);
      setSuccess(true);
      setTimeout(() => router.push('/'), 700);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Username atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col transition-all duration-700"
      style={{
        background: 'linear-gradient(160deg, #F97316 0%, #c45c0a 45%, #7c3a00 100%)',
        opacity: success ? 0 : 1,
        transform: success ? 'scale(1.04)' : 'scale(1)',
      }}
    >

      {/* Top area — branding */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <div className="w-20 h-20 rounded-2xl bg-black/20 flex items-center justify-center mb-5">
          <img src="/logo-sd.png" alt="Logo" className="w-14 h-14 object-contain brightness-0 invert" />
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">SD Al-Fakhir</h1>
        <p className="text-orange-200 text-sm mt-1">Sawangan, Depok</p>

        {/* Dekoratif dots */}
        <div className="flex gap-2 mt-8 opacity-25">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
          ))}
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl">

        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

        <h2 className="text-xl font-bold text-gray-900 mb-1">Masuk ke Portal</h2>
        <p className="text-sm text-gray-400 mb-7">Untuk siswa & orang tua Al-Fakhir</p>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 flex items-start gap-2">
            <span className="mt-0.5 text-red-400 flex-shrink-0">⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 tracking-wide uppercase">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
              autoComplete="username"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 tracking-wide uppercase">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 pr-12 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 active:scale-95"
            style={{ background: (loading || success) ? '#f9a05e' : 'linear-gradient(135deg, #F97316 0%, #e8620d 100%)', boxShadow: '0 8px 24px rgba(249,115,22,0.35)' }}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>Masuk <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-6">
          Lupa password?{' '}
          <span className="text-[#F97316] font-medium">Hubungi admin sekolah</span>
        </p>

        <p className="text-[10px] text-center text-gray-300 mt-4">
          © 2026 Al-Fakhir School · Sawangan, Depok
        </p>
        <p className="text-[10px] text-center text-gray-300 mt-1">
          Developed by <span className="text-[#F97316] font-medium">Feri</span>
        </p>
      </div>
    </div>
  );
}
