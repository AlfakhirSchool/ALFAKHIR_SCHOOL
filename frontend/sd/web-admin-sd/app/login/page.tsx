'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const DOMAIN = '';

type JenjangInfo = { logo: string; name: string; sub: string; accent: string; panelBg: string };

// web-admin-sd: selalu SD
const getJenjangFromHostname = (): JenjangInfo => {
  return { logo: '/logo-sd.png', name: 'SD Islam Al-Fakhir', sub: 'Admin SD', accent: '#F97316', panelBg: '#C2440E' };
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [jenjang, setJenjang] = useState<JenjangInfo>({ logo: '/logo-sd.png', name: 'SD Islam Al-Fakhir', sub: 'Admin SD', accent: '#F97316', panelBg: '#C2440E' });

  useEffect(() => { setJenjang(getJenjangFromHostname()); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const email = username.includes('@') ? username : `${username}${DOMAIN}`;
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data.data;
      // web-admin-sd: hanya admin SD atau admin master
      const isAdminSD = user.role === 'admin' && (user.school_level === 'SD' || !user.school_level);
      if (!isAdminSD) {
        setError('Akses hanya untuk Admin SD atau Admin Master');
        setLoading(false);
        return;
      }
      login(user, accessToken, refreshToken);
      sessionStorage.setItem('just_logged_in', '1');
      router.push('/dashboard/sd');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#f0f4f8]">

      {/* Left panel */}
      <motion.div
        className="hidden lg:flex w-[45%] flex-col items-center justify-center relative overflow-hidden p-12"
        style={{
          backgroundImage: 'url(/school-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Dark overlay so text stays readable over photo */}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: jenjang.accent }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: jenjang.accent }} />

        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          className="relative z-10"
        >
          <div className="w-44 h-44 relative flex items-center justify-center">
            {/* Ripple rings */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: jenjang.accent }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.65, ease: 'easeOut' }}
              />
            ))}
            {/* White circle container so logo bg blends */}
            <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center relative z-10 shadow-lg">
              <motion.img
                src={jenjang.logo}
                alt={jenjang.name}
                className="w-24 h-24 object-contain"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="relative z-10 text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold tracking-wide drop-shadow-lg" style={{ color: '#ffffff' }}>{jenjang.name}</h2>
          <p className="text-sm mt-2 tracking-widest uppercase drop-shadow" style={{ color: '#ffffff' }}>{jenjang.sub}</p>
          <p className="text-sm mt-6 leading-relaxed max-w-xs drop-shadow" style={{ color: '#ffffff' }}>
            Sistem Informasi Manajemen Sekolah — Al Fakhir School
          </p>
        </motion.div>

        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2">
          {[0,1,2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: jenjang.accent }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
          ))}
        </div>
      </motion.div>

      {/* Right panel */}
      <motion.div
        className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-[#f0f4f8] to-[#e8eef8]"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${jenjang.accent}18` }}>
              <img src={jenjang.logo} alt="Logo" className="w-12 h-12 object-contain" />
            </div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: jenjang.accent }}>{jenjang.name}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-[#1A2332]">Selamat datang</h1>
            <p className="text-gray-500 mt-1 text-sm">Masuk ke {jenjang.sub}</p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Username</label>
              <div className={`relative rounded-xl border-2 transition-all duration-200 bg-white ${focused === 'user' ? 'shadow-md' : 'border-gray-200'}`}
                style={focused === 'user' ? { borderColor: jenjang.accent, boxShadow: `0 4px 14px ${jenjang.accent}18` } : {}}>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value.trim())}
                  onFocus={() => setFocused('user')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3.5 bg-transparent rounded-xl focus:outline-none text-[#1A2332]"
                  placeholder="Username atau email"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
              <div className={`relative rounded-xl border-2 transition-all duration-200 bg-white ${focused === 'pw' ? '' : 'border-gray-200'}`}
                style={focused === 'pw' ? { borderColor: jenjang.accent, boxShadow: `0 4px 14px ${jenjang.accent}18` } : {}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3.5 pr-12 bg-transparent rounded-xl focus:outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword
                    ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                    : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="relative w-full text-white py-4 rounded-xl font-semibold text-sm tracking-wide overflow-hidden disabled:opacity-60"
              style={{ backgroundColor: jenjang.accent }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                whileHover={{ translateX: '200%' }}
                transition={{ duration: 0.6 }}
              />
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Masuk...
                </span>
              ) : 'Masuk Sekarang'}
            </motion.button>
          </motion.form>

          <motion.p
            className="mt-6 text-center text-xs text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            SD/SMP/SMA Islam Modern Al Fakhir © 2026 · Developed by Feri
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
