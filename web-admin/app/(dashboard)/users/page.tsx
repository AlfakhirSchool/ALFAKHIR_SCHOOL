'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const DOMAIN = '@alfakhirschool.sch.id';
const stripDomain = (email: string) => email.replace(/@[^@]+$/, '');

const ROLE_COLOR: Record<string, string> = {
  admin: '#F97316', guru: '#2563EB', siswa: '#16A34A', ortu: '#9333EA',
};
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', guru: 'Guru', siswa: 'Siswa', ortu: 'Orang Tua',
};
const LEVEL_COLOR: Record<string, string> = {
  SD: '#F97316', SMP: '#2563EB', SMA: '#7C3AED',
};
const LEVELS = ['SD', 'SMP', 'SMA'] as const;

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: color }}>
      {text}
    </span>
  );
}

function JenjangCell({ u }: { u: any }) {
  if (u.role === 'guru') {
    const levels: string[] = u.guru_detail?.school_levels || [];
    if (levels.length === 0) return <span className="text-xs text-gray-400 italic">Belum ditentukan</span>;
    if (levels.length === 3) return (
      <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-gradient-to-r from-[#F97316] via-[#2563EB] to-[#7C3AED]">
        Gabungan
      </span>
    );
    return (
      <div className="flex flex-wrap gap-1">
        {levels.map((l: string) => (
          <span key={l} className="px-1.5 py-0.5 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: LEVEL_COLOR[l] || '#888' }}>
            {l}
          </span>
        ))}
      </div>
    );
  }
  if (u.role === 'admin') {
    return u.school_level
      ? <Badge text={u.school_level} color={LEVEL_COLOR[u.school_level] || '#888'} />
      : <span className="text-xs text-gray-400 italic">Master</span>;
  }
  if (u.role === 'siswa') {
    const lvl = u.siswa_detail?.kelas?.sekolah?.level;
    return lvl
      ? <Badge text={lvl} color={LEVEL_COLOR[lvl] || '#888'} />
      : <span className="text-xs text-gray-400">—</span>;
  }
  return <span className="text-xs text-gray-400">—</span>;
}

function generatePassword(nama: string) {
  const base = (nama || 'user').split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'alfakhir';
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

type CreateForm = { email: string; password: string; nama: string; role: string; school_level: string; };

export default function UsersPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const adminJenjang = user?.school_level ?? null; // null = master admin
  const isMaster = !adminJenjang;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const [resetModal, setResetModal] = useState<{ id: string; nama: string; role: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ email: '', password: '', nama: '', role: 'admin', school_level: adminJenjang || '' });
  const [showCreatePw, setShowCreatePw] = useState(false);

  // Modal set jenjang guru
  const [jenjangModal, setJenjangModal] = useState<{ id: string; nama: string; guruId: string; currentLevels: string[] } | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, page],
    queryFn: () => api.get('/users', {
      params: { search: search || undefined, role: roleFilter || undefined, page, limit: 30 },
    }).then(r => r.data),
  });

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
    mutationFn: (form: CreateForm) => {
      const email = form.email.includes('@') ? form.email : `${form.email}${DOMAIN}`;
      return api.post('/users', { ...form, email, school_level: form.school_level || null }).then(r => r.data);
    },
    onSuccess: (d) => {
      showFeedback('success', d.message);
      setCreateModal(false);
      setCreateForm({ email: '', password: '', nama: '', role: 'admin', school_level: adminJenjang || '' });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-stats'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal membuat akun'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`).then(r => r.data),
    onSuccess: (d) => { showFeedback('success', d.message); qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['users-stats'] }); },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal menghapus akun'),
  });

  const resetDeviceMut = useMutation({
    mutationFn: (id: string) => api.post(`/auth/reset-device/${id}`).then(r => r.data),
    onSuccess: (d) => showFeedback('success', d.message),
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal reset perangkat'),
  });

  const jenjangMut = useMutation({
    mutationFn: ({ id, school_levels }: { id: string; school_levels: string[] }) =>
      api.put(`/users/${id}/set-jenjang`, { school_levels }).then(r => r.data),
    onSuccess: (d) => {
      showFeedback('success', d.message);
      setJenjangModal(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal set jenjang'),
  });

  const toggleLevel = (l: string) => setSelectedLevels(prev =>
    prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]
  );

  const users = data?.data || [];
  const pagination = data?.pagination || {};
  const stats = statsData || { admin: 0, guru: 0, siswa: 0, ortu: 0 };

  const pageTitle = adminJenjang ? `Kelola Akun — ${adminJenjang}` : 'Kelola Akun';

  return (
    <div>
      <Header title={pageTitle} />
      <div className="p-6 space-y-6">

        {feedback && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
            <span>{feedback.type === 'success' ? '✓' : '✕'}</span> {feedback.msg}
          </div>
        )}

        {/* Scope banner untuk jenjang admin */}
        {adminJenjang && (
          <div className="rounded-2xl p-4 flex items-center gap-3 text-white"
            style={{ backgroundColor: LEVEL_COLOR[adminJenjang] }}>
            <span className="text-2xl">🏫</span>
            <div>
              <p className="font-bold text-sm">Mode Admin {adminJenjang}</p>
              <p className="text-xs opacity-85">Anda hanya melihat dan mengelola akun dalam lingkup {adminJenjang}. Admin Master mengelola semua jenjang.</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-4">
          <span className="text-3xl flex-shrink-0">🔑</span>
          <div>
            <p className="font-bold text-blue-800 text-sm mb-1">Panduan Kelola Akun</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Klik <strong>Reset PW</strong> untuk memulihkan password user yang lupa</li>
              <li>Klik <strong>Set Jenjang</strong> (khusus Guru) untuk menentukan di jenjang mana guru mengajar</li>
              {isMaster && <li>Sebagai Master Admin, Anda dapat mengelola semua jenjang</li>}
            </ul>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { role: 'admin', label: 'Admin', icon: '🛡️' },
            { role: 'guru',  label: 'Guru',  icon: '👨‍🏫' },
            { role: 'siswa', label: 'Siswa', icon: '👨‍🎓' },
            { role: 'ortu',  label: 'Orang Tua', icon: '👨‍👧' },
          ].map(({ role, label, icon }) => (
            <button key={role}
              onClick={() => { setRoleFilter(r => r === role ? '' : role); setPage(1); }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${roleFilter === role ? 'shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              style={roleFilter === role ? { borderColor: ROLE_COLOR[role], backgroundColor: ROLE_COLOR[role] + '10' } : {}}
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-xl font-bold text-[#1A2332]">{(stats as any)[role] ?? '—'}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Filter + Tambah */}
        <div className="flex flex-wrap gap-3 items-center">
          <input placeholder="🔍 Cari nama atau email..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-56 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          />
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]">
            <option value="">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="guru">Guru</option>
            <option value="siswa">Siswa</option>
            <option value="ortu">Orang Tua</option>
          </select>
          <button onClick={() => setCreateModal(true)}
            className="px-5 py-2.5 bg-[#F97316] text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors">
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
                <tr><td colSpan={5} className="text-center py-14 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin" />
                    <span>Memuat data...</span>
                  </div>
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-14 text-gray-400">
                  <div className="text-4xl mb-2">👤</div>Tidak ada akun ditemukan
                </td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-[#1A2332] text-sm">{u.nama}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{stripDomain(u.email)}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge text={ROLE_LABEL[u.role] || u.role} color={ROLE_COLOR[u.role] || '#888'} />
                  </td>
                  <td className="px-5 py-3.5"><JenjangCell u={u} /></td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? '● Aktif' : '● Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      {/* Tombol Set Jenjang khusus guru */}
                      {u.role === 'guru' && (
                        <button
                          onClick={() => {
                            const levels = u.guru_detail?.school_levels || [];
                            setJenjangModal({ id: u.id, nama: u.nama, guruId: u.guru_detail?.id, currentLevels: levels });
                            setSelectedLevels([...levels]);
                          }}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          🏫 Jenjang
                        </button>
                      )}
                      <button
                        onClick={() => { setResetModal({ id: u.id, nama: u.nama, role: u.role }); setNewPassword(generatePassword(u.nama)); setShowNewPw(false); }}
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
                      {(u.role === 'siswa' || u.role === 'ortu') && (
                        <button
                          onClick={() => { if (confirm(`Reset perangkat ${u.nama}? Mereka bisa login di HP baru.`)) resetDeviceMut.mutate(u.id); }}
                          disabled={resetDeviceMut.isPending}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          📱 Reset HP
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm(`Hapus akun ${u.nama}? Data tidak dapat dikembalikan.`)) deleteMut.mutate(u.id); }}
                        disabled={deleteMut.isPending}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">{pagination.total} akun · hal. {page} dari {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">← Prev</button>
                <span className="px-4 py-1.5 bg-[#F97316] text-white rounded-lg text-sm font-semibold">{page}</span>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL: Set Jenjang Guru ===== */}
      {jenjangModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="bg-gradient-to-r from-[#7C3AED] to-purple-400 rounded-t-2xl p-5 text-white">
              <h3 className="font-bold text-lg">🏫 Set Jenjang Mengajar</h3>
              <p className="text-sm text-purple-100 mt-0.5">Guru: <strong>{jenjangModal.nama}</strong></p>
            </div>
            <div className="p-6">
              <p className="text-xs text-gray-500 mb-3">Pilih satu atau lebih jenjang yang diajar guru ini. Pilih semua untuk Guru Gabungan.</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex gap-2 text-xs text-green-700">
                <span className="flex-shrink-0">✅</span>
                <span>Data nilai, absensi, dan jadwal guru <strong>tidak akan hilang</strong> ketika jenjang diubah. Perubahan ini hanya mengatur di jenjang mana guru terlihat.</span>
              </div>

              {/* Jenjang checkboxes */}
              <div className="space-y-3 mb-5">
                {(isMaster ? LEVELS : LEVELS.filter(l => l === adminJenjang)).map(level => {
                  const selected = selectedLevels.includes(level);
                  return (
                    <button key={level} type="button" onClick={() => toggleLevel(level)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${selected ? 'border-transparent text-white' : 'border-gray-200 hover:border-gray-300'}`}
                      style={selected ? { backgroundColor: LEVEL_COLOR[level] } : {}}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-white border-white' : 'border-gray-300'}`}>
                        {selected && <span className="text-xs font-black" style={{ color: LEVEL_COLOR[level] }}>✓</span>}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{level}</p>
                        <p className={`text-xs ${selected ? 'text-white/80' : 'text-gray-400'}`}>
                          {level === 'SD' ? 'Sekolah Dasar' : level === 'SMP' ? 'Sekolah Menengah Pertama' : 'Sekolah Menengah Atas'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm text-center">
                {selectedLevels.length === 0 ? (
                  <span className="text-gray-400">Belum ada jenjang dipilih</span>
                ) : selectedLevels.length === 3 ? (
                  <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] via-[#2563EB] to-[#7C3AED]">
                    🎓 Guru Gabungan (SD + SMP + SMA)
                  </span>
                ) : (
                  <span className="font-semibold text-gray-700">
                    Guru {selectedLevels.join(' + ')}
                    {selectedLevels.length > 1 ? ' (Gabungan)' : ''}
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setJenjangModal(null); setSelectedLevels([]); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">
                  Batal
                </button>
                <button
                  onClick={() => jenjangMut.mutate({ id: jenjangModal.id, school_levels: selectedLevels })}
                  disabled={jenjangMut.isPending}
                  className="flex-1 px-4 py-2.5 bg-[#7C3AED] text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  {jenjangMut.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </span>
                  ) : '✓ Simpan Jenjang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Reset Password ===== */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl p-5 text-white">
              <h3 className="font-bold text-lg">🔑 Reset Password</h3>
              <p className="text-sm text-blue-100 mt-0.5">Akun: <strong>{resetModal.nama}</strong></p>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5 text-xs text-yellow-700">
                ⚠️ Informasikan password baru kepada <strong>{resetModal.nama}</strong> setelah direset.
              </div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password Baru</label>
              <div className="relative mb-1">
                <input type={showNewPw ? 'text' : 'password'} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                  placeholder="Minimal 6 karakter" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={() => setShowNewPw(s => !s)} className="p-1.5 text-gray-400 hover:text-gray-600 text-sm">
                    {showNewPw ? '🙈' : '👁️'}
                  </button>
                  <button type="button" onClick={() => setNewPassword(generatePassword(resetModal.nama))}
                    className="p-1.5 text-gray-400 hover:text-gray-600 text-sm" title="Generate acak">🎲</button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-6">Tekan 🎲 untuk generate password acak</p>
              <div className="flex gap-3">
                <button onClick={() => { setResetModal(null); setNewPassword(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
                <button onClick={() => resetMut.mutate({ id: resetModal.id, password: newPassword })}
                  disabled={!newPassword || newPassword.length < 6 || resetMut.isPending}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                  {resetMut.isPending ? 'Mereset...' : '✓ Simpan Password Baru'}
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
            <div className="bg-gradient-to-r from-[#F97316] to-orange-400 rounded-t-2xl p-5 text-white sticky top-0">
              <h3 className="font-bold text-lg">➕ Daftarkan Akun Baru</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap <span className="text-red-400">*</span></label>
                <input value={createForm.nama} onChange={e => setCreateForm(f => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  placeholder="Nama lengkap" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value.trim().replace(/[@\s]/g, '') }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  placeholder="nama.guru"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type={showCreatePw ? 'text' : 'password'} value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-20 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-mono"
                    placeholder="Min. 6 karakter" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button type="button" onClick={() => setShowCreatePw(s => !s)} className="p-1.5 text-gray-400 hover:text-gray-600 text-sm">
                      {showCreatePw ? '🙈' : '👁️'}
                    </button>
                    <button type="button" onClick={() => setCreateForm(f => ({ ...f, password: generatePassword(f.nama || 'user') }))}
                      className="p-1.5 text-gray-400 hover:text-gray-600 text-sm">🎲</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'admin', label: 'Admin', icon: '🛡️', desc: 'Kelola data sekolah' },
                    { value: 'guru',  label: 'Guru',  icon: '👨‍🏫', desc: 'Input nilai & absensi' },
                    { value: 'siswa', label: 'Siswa', icon: '👨‍🎓', desc: 'Akses info pribadi' },
                    { value: 'ortu',  label: 'Orang Tua', icon: '👨‍👧', desc: 'Pantau anak' },
                  ].map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setCreateForm(f => ({ ...f, role: r.value, school_level: '' }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${createForm.role === r.value ? 'border-[#F97316] bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-0.5"><span>{r.icon}</span><span className="font-semibold text-sm text-[#1A2332]">{r.label}</span></div>
                      <p className="text-xs text-gray-400">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              {createForm.role === 'admin' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Jenjang Admin
                    {!isMaster && <span className="ml-2 text-xs font-normal text-gray-400">(dikunci ke {adminJenjang})</span>}
                  </label>
                  {isMaster ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setCreateForm(f => ({ ...f, school_level: '' }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${!createForm.school_level ? 'border-gray-600 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <p className="font-semibold text-sm">🌐 Master</p>
                        <p className="text-xs text-gray-400">Akses semua jenjang</p>
                      </button>
                      {LEVELS.map(level => (
                        <button key={level} type="button" onClick={() => setCreateForm(f => ({ ...f, school_level: level }))}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${createForm.school_level === level ? 'text-white border-transparent' : 'border-gray-100 hover:border-gray-200'}`}
                          style={createForm.school_level === level ? { backgroundColor: LEVEL_COLOR[level] } : {}}>
                          <p className="font-semibold text-sm">{level}</p>
                          <p className={`text-xs ${createForm.school_level === level ? 'text-white/80' : 'text-gray-400'}`}>Hanya {level}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl text-white font-semibold text-sm"
                      style={{ backgroundColor: LEVEL_COLOR[adminJenjang!] }}>
                      {adminJenjang} — Admin akan memiliki akses lingkup {adminJenjang} saja
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setCreateModal(false); setCreateForm({ email: '', password: '', nama: '', role: 'admin', school_level: adminJenjang || '' }); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
                <button onClick={() => createMut.mutate(createForm)}
                  disabled={!createForm.email || !createForm.password || !createForm.nama || createMut.isPending}
                  className="flex-1 px-4 py-2.5 bg-[#F97316] text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
                  {createMut.isPending ? 'Membuat...' : '✓ Buat Akun'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
