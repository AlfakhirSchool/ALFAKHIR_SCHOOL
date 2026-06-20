'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const ROLE_COLOR: Record<string, string> = {
  admin: '#F97316', guru: '#2563EB', siswa: '#16A34A', ortu: '#9333EA',
};
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', guru: 'Guru', siswa: 'Siswa', ortu: 'Orang Tua',
};
const LEVEL_COLOR: Record<string, string> = {
  SD: '#F97316', SMP: '#2563EB', SMA: '#7C3AED',
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: color }}>
      {text}
    </span>
  );
}

function generatePassword(role: string, nama: string) {
  const base = nama.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}${suffix}`;
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [resetModal, setResetModal] = useState<{ id: string; nama: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', nama: '', role: 'admin', school_level: '' });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, page],
    queryFn: () => api.get('/users', {
      params: { search: search || undefined, role: roleFilter || undefined, page, limit: 30 },
    }).then(r => r.data),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put(`/users/${id}/reset-password`, { password }).then(r => r.data),
    onSuccess: (d) => { showFeedback('success', d.message); setResetModal(null); setNewPassword(''); },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal reset password'),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => api.put(`/users/${id}/toggle-active`).then(r => r.data),
    onSuccess: (d) => { showFeedback('success', d.message); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal mengubah status'),
  });

  const createMut = useMutation({
    mutationFn: (form: typeof createForm) =>
      api.post('/users', { ...form, school_level: form.school_level || null }).then(r => r.data),
    onSuccess: (d) => {
      showFeedback('success', d.message);
      setCreateModal(false);
      setCreateForm({ email: '', password: '', nama: '', role: 'admin', school_level: '' });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal membuat akun'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <Header title="Manajemen Akun" />
      <div className="p-6 space-y-5">

        {/* Feedback toast */}
        {feedback && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
            {feedback.type === 'success' ? '✓' : '✕'} {feedback.msg}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            placeholder="🔍 Cari nama atau email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-56 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          />
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]">
            <option value="">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="guru">Guru</option>
            <option value="siswa">Siswa</option>
            <option value="ortu">Orang Tua</option>
          </select>
          <button
            onClick={() => setCreateModal(true)}
            className="px-4 py-2.5 bg-[#F97316] text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            + Tambah Akun
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Nama / Email</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Role</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Jenjang</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Status</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-14 text-gray-400">Memuat...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-14 text-gray-400">Tidak ada akun ditemukan</td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-[#1A2332] text-sm">{u.nama}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge text={ROLE_LABEL[u.role] || u.role} color={ROLE_COLOR[u.role] || '#888'} />
                  </td>
                  <td className="px-5 py-3.5">
                    {u.school_level
                      ? <Badge text={u.school_level} color={LEVEL_COLOR[u.school_level] || '#888'} />
                      : <span className="text-xs text-gray-400">Master</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setResetModal({ id: u.id, nama: u.nama }); setNewPassword(generatePassword(u.role, u.nama)); }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        🔑 Reset PW
                      </button>
                      <button
                        onClick={() => toggleMut.mutate(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                      >
                        {u.is_active ? '⛔ Nonaktifkan' : '✅ Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">{pagination.total} akun</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">← Prev</button>
                <span className="px-3 py-1.5 bg-[#F97316] text-white rounded-lg text-sm">{page}</span>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Reset Password */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="font-bold text-lg text-[#1A2332] mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-5">Akun: <strong>{resetModal.nama}</strong></p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
            <div className="relative mb-2">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-20 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button type="button" onClick={() => setShowNewPw(s => !s)}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showNewPw ? '🙈' : '👁️'}
              </button>
              <button type="button"
                onClick={() => setNewPassword(generatePassword('', resetModal.nama))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs" title="Generate acak">
                🎲
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6">Klik 🎲 untuk generate password acak</p>

            <div className="flex gap-3">
              <button onClick={() => { setResetModal(null); setNewPassword(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                Batal
              </button>
              <button
                onClick={() => resetMut.mutate({ id: resetModal.id, password: newPassword })}
                disabled={!newPassword || newPassword.length < 6 || resetMut.isPending}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {resetMut.isPending ? 'Mereset...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Akun */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="font-bold text-lg text-[#1A2332] mb-5">Tambah Akun Baru</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input value={createForm.nama} onChange={e => setCreateForm(f => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  placeholder="Nama lengkap" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  placeholder="email@alfakhirschool.id" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="flex gap-2">
                  <input value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    placeholder="Min. 6 karakter" />
                  <button type="button"
                    onClick={() => setCreateForm(f => ({ ...f, password: generatePassword(f.role, f.nama || 'user') }))}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50" title="Generate acak">
                    🎲
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value, school_level: '' }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]">
                    <option value="admin">Admin</option>
                    <option value="guru">Guru</option>
                    <option value="siswa">Siswa</option>
                    <option value="ortu">Orang Tua</option>
                  </select>
                </div>
                {createForm.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenjang Admin</label>
                    <select value={createForm.school_level} onChange={e => setCreateForm(f => ({ ...f, school_level: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]">
                      <option value="">Master (semua)</option>
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setCreateModal(false); setCreateForm({ email: '', password: '', nama: '', role: 'admin', school_level: '' }); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                Batal
              </button>
              <button
                onClick={() => createMut.mutate(createForm)}
                disabled={!createForm.email || !createForm.password || !createForm.nama || createMut.isPending}
                className="flex-1 px-4 py-2.5 bg-[#F97316] text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
              >
                {createMut.isPending ? 'Membuat...' : 'Buat Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
