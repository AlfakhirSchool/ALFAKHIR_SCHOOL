'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', form);
      const { user, accessToken, refreshToken } = res.data.data;

      if (!['guru', 'admin'].includes(user.role)) {
        setError('Akses hanya untuk Guru');
        setLoading(false);
        return;
      }

      login(user, accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2332] to-[#1B8B87] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-32 h-32 flex items-center justify-center">
            <img src="/logo.png" alt="Al Fakhir School" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A2332]">Al Fakhir School</h1>
          <p className="text-gray-500 text-sm mt-1">Portal Guru</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87] focus:border-transparent"
              placeholder="guru@alfakhirschool.id"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B8B87] text-white py-3 rounded-lg font-semibold hover:bg-[#156f6c] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">SD/SMP/SMA Islam Modern Al Fakhir</p>
        </div>
      </div>
    </div>
  );
}
