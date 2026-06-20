'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const ROLE_COLOR: Record<string, string> = {
  admin: '#F97316', guru: '#2563EB', siswa: '#16A34A', ortu: '#9333EA',
};
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', guru: 'Guru', siswa: 'Siswa', ortu: 'Orang Tua',
};
const LEVEL_COLOR: Record<string, string> = {
  SD: '#F97316', SMP: '#2563EB', SMA: '#7C3AED',
};
const LEVEL_LABEL: Record<string, string> = {
  SD: 'SD (Oranye)', SMP: 'SMP (Biru)', SMA: 'SMA (Ungu)',
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: color }}>
      {text}
    </span>
  );
}

function generatePassword(nama: string) {
  const base = (nama || 'user').split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'alfakhir';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}${suffix}`;
}

type CreateForm = {
  email: string; password: string; nama: string; role: string; school_level: string;
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  // Guard: hanya master admin (school_level null)
  useEffect(() => {
    if (user && user.school_level) {
      router.replace(`/dashboard/${user.school_level.toLowerCase()}`);
    }
  }, [user, router]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal reset password
  const [resetModal, setResetModal] = useState<{ id: string; nama: string; role: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  // Modal buat akun
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    email: '', password: '', nama: '', role: 'admin', school_level: '',
  });
  const [showCreatePw, setShowCreatePw] = useState(false);

  // Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, page],
    queryFn: () =>
      api.get('/users', {
        params: { search: search || undefined, role: roleFilter || undefined, page, limit: 30 },
      }).then(r => r.data),
    enabled: !user?.school_level,
  });

  // Stats per role
  const { data: statsData } = useQuery({
    queryKey: ['users-stats'],
    queryFn: async () => {
      const [a, g, s, o] = await Promise.all([
        api.get('/users', { params: { role: 'admin', limit: 1 } }).then(r => r.data.pagination?.total || 0),
        api.get('/users', { params: { role: 'guru', limit: 1 } }).then(r => r.data.pagination?.total || 0),
        api.get('/users', { params: { role: 'siswa', limit: 1 } }).then(r => r.data.pagination?.total || 0),
        api.get('/users', { params: { role: 'ortu', limit: 1 } }).then(r => r.data.pagination?.total || 0),
      ]);
      return { admin: a, guru: g, siswa: s, ortu: o };
    },
    enabled: !user?.school_level,
  });

  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put(`/users/${id}/reset-password`, { password }).then(r => r.data),
    onSuccess: (d) => {
      showFeedback('success', d.message);
      setResetModal(null);
      setNewPassword('');
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal reset password'),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => api.put(`/users/${id}/toggle-active`).then(r => r.data),
    onSuccess: (d) => {
      showFeedback('success', d.message);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal mengubah status'),
  });

  const createMut = useMutation({
    mutationFn: (form: CreateForm) =>
      api.post('/users', { ...form, school_level: form.school_level || null }).then(r => r.data),
    onSuccess: (d) => {
      showFeedback('success', d.message);
      setCreateModal(false);
      setCreateForm({ email: '', password: '', nama: '', role: 'admin', school_level: '' });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-stats'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal membuat akun'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination || {};
  const stats = statsData || { admin: 0, guru: 0, siswa: 0, ortu: 0 };

  if (user?.school_level) return null;

  return (
    <div>
      <Header title="Kelola Akun" />
      <div className="p-6 space-y-6">

        {/* Toast */}
        {feedback && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
            <span>{feedback.type === 'success' ? '✓' : '✕'}</span>
            {feedback.msg}
          </div>
        )}

        {/* Info box reset password */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-4">
          <span className="text-3xl flex-shrink-0">🔑</span>
          <div>
            <p className="font-bold text-blue-800 text-sm mb-1">Panduan Reset Password</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Cari akun user yang lupa password menggunakan kolom pencarian di bawah</li>
              <li>Klik tombol <strong>Reset PW</strong> pada baris akun tersebut</li>
              <li>Masukkan password baru atau gunakan tombol 🎲 untuk generate otomatis</li>
              <li>Password baru berlaku langsung setelah disimpan — informasikan ke user</li>
            </ul>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { role: 'admin', label: 'Admin', icon: '🛡️' },
            { role: 'guru',  label: 'Guru',  icon: '👨‍🏫' },
            { role: 'siswa', label: 'Siswa', icon: '👨‍🎓' },
            { role: 'ortu',  label: 'Orang Tua', icon: '👨‍👧' },
          ].map(({ role, label, icon }) => (
            <button
              key={role}
              onClick={() => { setRoleFilter(r => r === role ? '' : role); setPage(1); }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${roleFilter === role ? 'shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              style={roleFilter === role ? { borderColor: ROLE_COLOR[role], backgroundColor: ROLE_COLOR[role] + '10' } : {}}
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-xl font-bold text-[#1A2332]">{stats[role as keyof typeof stats] ?? '—'}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Filter + Tambah */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            placeholder="🔍 Cari nama atau email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-56 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          />
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          >
            <option value="">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="guru">Guru</option>
            <option value="siswa">Siswa</option>
            <option value="ortu">Orang Tua</option>
          </select>
          <button
            onClick={() => setCreateModal(true)}
            className="px-5 py-2.5 bg-[#F97316] text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <span>+</span> Tambah Akun
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nama / Email</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Jenjang</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-2">👤</div>
                  <p>Tidak ada akun ditemukan</p>
                </td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
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
                      : <span className="text-xs text-gray-400 italic">Master</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? '● Aktif' : '● Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setResetModal({ id: u.id, nama: u.nama, role: u.role });
                          setNewPassword(generatePassword(u.nama));
                          setShowNewPw(false);
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        🔑 Reset PW
                      </button>
                      <button
                        onClick={() => toggleMut.mutate(u.id)}
                        disabled={toggleMut.isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                      >
                        {u.is_active ? '⛔ Nonaktifkan' : '✅ Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {pagination.total} akun · halaman {page} dari {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  ← Prev
                </button>
                <span className="px-4 py-1.5 bg-[#F97316] text-white rounded-lg text-sm font-semibold">{page}</span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL: Reset Password ===== */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl p-5 text-white">
              <h3 className="font-bold text-lg">🔑 Reset Password</h3>
              <p className="text-sm text-blue-100 mt-0.5">Akun: <strong>{resetModal.nama}</strong></p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-white/20 font-medium">
                {ROLE_LABEL[resetModal.role] || resetModal.role}
              </span>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5 text-xs text-yellow-700">
                ⚠️ Informasikan password baru ini kepada <strong>{resetModal.nama}</strong> setelah direset.
                Password lama tidak bisa digunakan lagi.
              </div>

              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password Baru</label>
              <div className="relative mb-1">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                  placeholder="Minimal 6 karakter"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={() => setShowNewPw(s => !s)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 text-sm">
                    {showNewPw ? '🙈' : '👁️'}
                  </button>
                  <button type="button"
                    onClick={() => setNewPassword(generatePassword(resetModal.nama))}
                    className="p-1.5 text-gray-400 hover:text-gray-600 text-sm" title="Generate acak">
                    🎲
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-6">Tekan 🎲 untuk generate password acak yang aman</p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setResetModal(null); setNewPassword(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => resetMut.mutate({ id: resetModal.id, password: newPassword })}
                  disabled={!newPassword || newPassword.length < 6 || resetMut.isPending}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {resetMut.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mereset...
                    </span>
                  ) : '✓ Simpan Password Baru'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Tambah Akun ===== */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#F97316] to-orange-400 rounded-t-2xl p-5 text-white sticky top-0">
              <h3 className="font-bold text-lg">➕ Daftarkan Akun Baru</h3>
              <p className="text-sm text-orange-100 mt-0.5">Isi semua data untuk membuat akun user baru</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap <span className="text-red-400">*</span></label>
                <input
                  value={createForm.nama}
                  onChange={e => setCreateForm(f => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  placeholder="Nama lengkap sesuai data"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  placeholder="email@alfakhirschool.id"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showCreatePw ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-20 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-mono"
                    placeholder="Min. 6 karakter"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button type="button" onClick={() => setShowCreatePw(s => !s)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 text-sm">
                      {showCreatePw ? '🙈' : '👁️'}
                    </button>
                    <button type="button"
                      onClick={() => setCreateForm(f => ({ ...f, password: generatePassword(f.nama || 'user') }))}
                      className="p-1.5 text-gray-400 hover:text-gray-600 text-sm" title="Generate acak">
                      🎲
                    </button>
                  </div>
                </div>
                {createForm.password && (
                  <p className="text-xs text-gray-400 mt-1 font-mono bg-gray-50 px-2 py-1 rounded">
                    Password: <strong>{createForm.password}</strong>
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'admin', label: 'Admin', icon: '🛡️', desc: 'Kelola data sekolah' },
                    { value: 'guru',  label: 'Guru',  icon: '👨‍🏫', desc: 'Input nilai & absensi' },
                    { value: 'siswa', label: 'Siswa', icon: '👨‍🎓', desc: 'Akses info pribadi' },
                    { value: 'ortu',  label: 'Orang Tua', icon: '👨‍👧', desc: 'Pantau perkembangan anak' },
                  ].map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setCreateForm(f => ({ ...f, role: r.value, school_level: '' }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${createForm.role === r.value ? 'border-[#F97316] bg-orange-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span>{r.icon}</span>
                        <span className="font-semibold text-sm text-[#1A2332]">{r.label}</span>
                      </div>
                      <p className="text-xs text-gray-400">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Jenjang (hanya untuk admin) */}
              {createForm.role === 'admin' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenjang Admin</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateForm(f => ({ ...f, school_level: '' }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${!createForm.school_level ? 'border-gray-600 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <p className="font-semibold text-sm text-[#1A2332]">🌐 Master</p>
                      <p className="text-xs text-gray-400">Akses semua jenjang</p>
                    </button>
                    {(['SD', 'SMP', 'SMA'] as const).map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCreateForm(f => ({ ...f, school_level: level }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${createForm.school_level === level ? 'text-white' : 'border-gray-100 hover:border-gray-200'}`}
                        style={createForm.school_level === level ? { backgroundColor: LEVEL_COLOR[level], borderColor: LEVEL_COLOR[level] } : {}}
                      >
                        <p className="font-semibold text-sm">{LEVEL_LABEL[level]}</p>
                        <p className={`text-xs ${createForm.school_level === level ? 'text-white/80' : 'text-gray-400'}`}>Hanya {level}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setCreateModal(false);
                    setCreateForm({ email: '', password: '', nama: '', role: 'admin', school_level: '' });
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => createMut.mutate(createForm)}
                  disabled={!createForm.email || !createForm.password || !createForm.nama || createMut.isPending}
                  className="flex-1 px-4 py-2.5 bg-[#F97316] text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {createMut.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Membuat...
                    </span>
                  ) : '✓ Buat Akun'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
