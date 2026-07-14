'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Monitor, Users, Eye, EyeOff, KeyRound, Search, Shield } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type Tab = 'profile' | 'password' | 'accounts' | 'system';

const ROLE_COLOR: Record<string, string> = {
  admin: '#F97316', guru: '#2563EB', siswa: '#16A34A', ortu: '#9333EA',
};

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

function AccountRow({ u, onReset }: { u: any; onReset: (id: string, nama: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: ROLE_COLOR[u.role] }}>
            {u.nama?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{u.nama}</p>
            <p className="text-xs text-gray-400">{u.email?.replace('@alfakhirschool.sch.id', '')}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-1 rounded-full font-semibold text-white" style={{ backgroundColor: ROLE_COLOR[u.role] }}>
          {u.role}
        </span>
        {u.school_level && (
          <span className="ml-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{u.school_level}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-700">
            {u.password_default ? (show ? u.password_default : '••••••••') : <span className="text-gray-300 text-xs">—</span>}
          </span>
          {u.password_default && (
            <button onClick={() => setShow(!show)} className="text-gray-400 hover:text-gray-600">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onReset(u.id, u.nama)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
        >
          <KeyRound size={12} />
          Ganti
        </button>
      </td>
    </tr>
  );
}

function ResetModal({ userId, nama, onClose }: { userId: string; nama: string; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.put(`/users/${userId}/reset-password`, { password: pw }),
    onSuccess: () => {
      setMsg('Password berhasil diubah');
      qc.invalidateQueries({ queryKey: ['all-users-master'] });
      setTimeout(onClose, 1200);
    },
    onError: (e: any) => setMsg(e.response?.data?.message || 'Gagal'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <KeyRound size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-gray-800">Ganti Password</p>
            <p className="text-xs text-gray-400">{nama}</p>
          </div>
        </div>

        {msg && (
          <div className={`text-sm px-3 py-2 rounded-lg mb-4 ${msg.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg}
          </div>
        )}

        <div className="relative mb-4">
          <input
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Password baru"
            className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            autoFocus
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-gray-400">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Batal
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={pw.length < 6 || mutation.isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [resetTarget, setResetTarget] = useState<{ id: string; nama: string } | null>(null);

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: pwForm.current_password, newPassword: pwForm.new_password }),
    onSuccess: () => { setMsg('Password berhasil diubah'); setPwForm({ current_password: '', new_password: '', confirm: '' }); },
    onError: (e: any) => setMsg(e.response?.data?.message || 'Gagal'),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users-master', roleFilter],
    queryFn: () => api.get(`/users?limit=200${roleFilter ? `&role=${roleFilter}` : ''}`).then(r => r.data.data || []),
    enabled: activeTab === 'accounts',
  });

  const filtered = (usersData || []).filter((u: any) =>
    !search || u.nama?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: Tab; icon: React.ElementType; label: string }[] = [
    { key: 'profile',  icon: User,    label: 'Profil' },
    { key: 'password', icon: Lock,    label: 'Password Saya' },
    { key: 'accounts', icon: Users,   label: 'Kelola Akun' },
    { key: 'system',   icon: Monitor, label: 'Sistem' },
  ];

  return (
    <div>
      <Header title="Pengaturan" />
      <div className="p-6 max-w-5xl">

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.key ? 'bg-[#1A2332] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={fadeUp} initial="hidden" animate="show">

            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
                    {user?.nama?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-800">{user?.nama}</p>
                    <p className="text-gray-400 text-sm">{user?.email}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Shield size={12} className="text-blue-600" />
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Master Administrator</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400">Untuk mengubah nama atau email, hubungi developer sistem.</p>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="bg-white rounded-2xl shadow-sm p-6 max-w-md">
                <h2 className="font-bold text-gray-800 mb-5">Ubah Password Saya</h2>
                {msg && (
                  <div className={`text-sm px-4 py-3 rounded-xl mb-4 ${msg.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {msg}
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); if (pwForm.new_password !== pwForm.confirm) { setMsg('Konfirmasi tidak cocok'); return; } changePassword.mutate(); }} className="space-y-4">
                  {[
                    { label: 'Password Saat Ini', key: 'current_password' },
                    { label: 'Password Baru', key: 'new_password' },
                    { label: 'Konfirmasi Password Baru', key: 'confirm' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <input type="password" value={(pwForm as any)[key]}
                        onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                        placeholder="••••••••" />
                    </div>
                  ))}
                  <button type="submit" disabled={changePassword.isPending}
                    className="w-full py-3 bg-[#1A2332] text-white rounded-xl font-semibold text-sm hover:bg-[#243040] disabled:opacity-50 transition-colors">
                    {changePassword.isPending ? 'Menyimpan...' : 'Ubah Password'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                  <h2 className="font-bold text-gray-800">Semua Akun</h2>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari nama / username..."
                        className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-52" />
                    </div>
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="">Semua Role</option>
                      <option value="admin">Admin</option>
                      <option value="guru">Guru</option>
                      <option value="siswa">Siswa</option>
                      <option value="ortu">Orang Tua</option>
                    </select>
                  </div>
                </div>

                {usersLoading ? (
                  <div className="text-center py-12 text-gray-400 text-sm">Memuat data...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-3 text-left font-semibold">Nama</th>
                          <th className="px-4 py-3 text-left font-semibold">Role</th>
                          <th className="px-4 py-3 text-left font-semibold">Password Default</th>
                          <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((u: any) => (
                          <AccountRow key={u.id} u={u} onReset={(id, nama) => setResetTarget({ id, nama })} />
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && (
                      <div className="text-center py-12 text-gray-400 text-sm">Tidak ada data</div>
                    )}
                  </div>
                )}
                <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
                  {filtered.length} akun ditemukan
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-4 max-w-xl">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Informasi Sistem</h3>
                  <div className="space-y-3 text-sm">
                    {[
                      { label: 'Aplikasi', value: 'Al Fakhir LMS v1.0' },
                      { label: 'Environment', value: process.env.NODE_ENV || 'production' },
                      { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between py-2.5 border-b border-gray-50">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-mono text-gray-800 text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Backup & Data</h3>
                  <div className="space-y-2">
                    <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 flex items-center justify-between transition-colors">
                      <span>Export semua data (JSON)</span>
                      <span className="text-blue-600 text-xs">Download →</span>
                    </button>
                    <div className="px-4 py-3 border border-gray-200 rounded-xl text-sm flex items-center justify-between">
                      <span>Status backup</span>
                      <span className="text-green-600 text-xs font-medium">✓ Normal</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {resetTarget && (
        <ResetModal userId={resetTarget.id} nama={resetTarget.nama} onClose={() => setResetTarget(null)} />
      )}
    </div>
  );
}
