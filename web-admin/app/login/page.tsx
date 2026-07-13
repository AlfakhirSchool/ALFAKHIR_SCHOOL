'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const DOMAIN = '@alfakhirschool.sch.id';

type JenjangInfo = { logo: string; name: string; sub: string; gradient: string; accent: string };

const getJenjangFromHostname = (): JenjangInfo => {
  if (typeof window === 'undefined') return { logo: '/logo-master.png', name: 'Al Fakhir School', sub: 'Admin Control Center', gradient: 'from-[#1A2332] to-[#3B7FD1]', accent: '#3B7FD1' };
  const h = window.location.hostname;
  if (h.startsWith('admin-sd.'))  return { logo: '/logo-sd.png',     name: 'SD Islam Modern Al-Fakhir',  sub: 'Admin SD',  gradient: 'from-[#92400E] to-[#F97316]', accent: '#F97316' };
  if (h.startsWith('admin-smp.')) return { logo: '/logo-smp.png',    name: 'SMP Islam Modern Al-Fakhir', sub: 'Admin SMP', gradient: 'from-[#134E4A] to-[#1B8B87]', accent: '#1B8B87' };
  if (h.startsWith('admin-sma.')) return { logo: '/logo-sma.png',    name: 'SMA Islam Modern Al-Fakhir', sub: 'Admin SMA', gradient: 'from-[#1E3A8A] to-[#3B82F6]', accent: '#3B82F6' };
  return { logo: '/logo-master.png', name: 'Al Fakhir School', sub: 'Admin Control Center', gradient: 'from-[#1A2332] to-[#3B7FD1]', accent: '#3B7FD1' };
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [jenjang, setJenjang] = useState<JenjangInfo>({ logo: '/logo-master.png', name: 'Al Fakhir School', sub: 'Admin Control Center', gradient: 'from-[#1A2332] to-[#3B7FD1]', accent: '#3B7FD1' });

  useEffect(() => { setJenjang(getJenjangFromHostname()); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const email = username.includes('@') ? username : `${username}${DOMAIN}`;

    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data.data;

      if (!['admin'].includes(user.role)) {
        setError('Akses hanya untuk Admin');
        setLoading(false);
        return;
      }

      login(user, accessToken, refreshToken);
      if (user.school_level === 'SD')  { router.push('/dashboard/sd');  return; }
      if (user.school_level === 'SMP') { router.push('/dashboard/smp'); return; }
      if (user.school_level === 'SMA') { router.push('/dashboard/sma'); return; }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${jenjang.gradient} flex items-center justify-center p-4`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-32 h-32 flex items-center justify-center">
            <img src={jenjang.logo} alt={jenjang.name} className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A2332]">{jenjang.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{jenjang.sub}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1] focus:border-transparent text-[#1A2332]"
              placeholder="Username"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1] focus:border-transparent"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: jenjang.accent }}
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">SD/SMP/SMA Islam Modern Al-Fakhir</p>
        </div>
      </div>
    </div>
  );
}
