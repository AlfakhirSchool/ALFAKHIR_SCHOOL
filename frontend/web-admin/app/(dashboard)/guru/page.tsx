'use client';

import { useState } from 'react';
import { Eye, EyeOff, Users, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const LEVEL_COLOR: Record<string, string> = {
  SD: '#F97316', SMP: '#2563EB',
};

const LEVELS = ['SD', 'SMP'] as const;

function LevelBadges({ levels }: { levels: string[] | null }) {
  if (!levels || levels.length === 0) {
    return <span className="text-xs text-gray-400 italic">Belum ditentukan</span>;
  }
  if (levels.length === 3) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-gradient-to-r from-[#F97316] via-[#2563EB] to-[#7C3AED]">
        Gabungan
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {levels.map(l => (
        <span key={l} className="px-1.5 py-0.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: LEVEL_COLOR[l] || '#888' }}>
          {l}
        </span>
      ))}
    </div>
  );
}

type GuruForm = {
  nama: string; email: string; password: string;
  nip: string; spesialisasi: string; no_telp: string;
  school_levels: string[];
};

const emptyForm: GuruForm = { nama: '', email: '', password: '', nip: '', spesialisasi: '', no_telp: '', school_levels: [] };

export default function GuruPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState<GuruForm>(emptyForm);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [hapusNama, setHapusNama] = useState<string>('');
  const [showPw, setShowPw] = useState(false);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['guru', search, jenjangFilter, page],
    queryFn: () => api.get('/guru', {
      params: { search: search || undefined, jenjang: jenjangFilter || undefined, page, limit: 20 },
    }).then(r => r.data),
  });

  const { data: mapelData } = useQuery({
    queryKey: ['mapel-all-for-guru'],
    queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data || []),
  });

  const mapelByJenjang: Record<string, string[]> = {};
  (mapelData || []).forEach((m: any) => {
    const j = m.jenjang || 'Lainnya';
    if (!mapelByJenjang[j]) mapelByJenjang[j] = [];
    mapelByJenjang[j].push(m.nama);
  });

  const buildEmail = (username: string) =>
    username;

  const createMut = useMutation({
    mutationFn: (f: GuruForm) => api.post('/guru', { ...f, email: buildEmail(f.email) }).then(r => r.data),
    onSuccess: (d) => {
      showFeedback('success', d.message);
      setModal(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal menambah guru'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, f }: { id: string; f: Partial<GuruForm> }) =>
      api.put(`/guru/${id}`, { ...f, email: f.email ? buildEmail(f.email) : undefined }).then(r => r.data),
    onSuccess: (d) => {
      showFeedback('success', d.message);
      setModal(null);
      setEditTarget(null);
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal memperbarui guru'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/guru/${id}`).then(r => r.data),
    onSuccess: (d) => {
      showFeedback('success', d.message || 'Guru berhasil dihapus');
      setHapusId(null);
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
    onError: (e: any) => showFeedback('error', e.response?.data?.message || 'Gagal menghapus guru'),
  });

  const toggleLevel = (level: string) => {
    setForm(f => ({
      ...f,
      school_levels: f.school_levels.includes(level)
        ? f.school_levels.filter(l => l !== level)
        : [...f.school_levels, level],
    }));
  };

  const openEdit = (g: any) => {
    setEditTarget(g);
    setForm({
      nama: g.user?.nama || '',
      email: g.user?.email || '',
      password: '',
      nip: g.nip || '',
      spesialisasi: g.spesialisasi || '',
      no_telp: g.no_telp || '',
      school_levels: g.school_levels || [],
    });
    setModal('edit');
  };

  const guruList = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <Header title="Manajemen Guru" />
      <div className="p-6 space-y-5">

        {/* Toast */}
        {feedback && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
            {feedback.type === 'success' ? '✓' : '✕'} {feedback.msg}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            placeholder="Cari nama guru..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
          />

          {/* Jenjang filter tabs — hanya untuk master admin */}
          {!user?.school_level && (
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => { setJenjangFilter(''); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!jenjangFilter ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Semua
              </button>
              {LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => { setJenjangFilter(l); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-white`}
                  style={jenjangFilter === l
                    ? { backgroundColor: LEVEL_COLOR[l] }
                    : { backgroundColor: 'transparent', color: LEVEL_COLOR[l] }
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => { setForm(emptyForm); setModal('create'); }}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-xl text-sm font-bold hover:bg-[#2d6ab5] transition-colors"
          >
            + Tambah Guru
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Nama / Email</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Jenjang</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Spesialisasi</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Status</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-14 text-gray-400">Memuat...</td></tr>
              ) : guruList.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-14 text-gray-400">
                  <div className="mb-2 text-gray-300 flex justify-center"><Users size={40} /></div>
                  <p>Tidak ada data guru ditemukan</p>
                </td></tr>
              ) : guruList.map((g: any) => (
                <tr key={g.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1B8B87]/10 flex items-center justify-center text-[#1B8B87] font-bold text-sm flex-shrink-0">
                        {g.user?.nama?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A2332] text-sm">{g.user?.nama}</p>
                        <p className="text-xs text-gray-400">{g.user?.email || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><LevelBadges levels={g.school_levels} /></td>
                  <td className="px-5 py-3.5">
                    {g.spesialisasi ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {g.spesialisasi.split(',').map((s: string) => s.trim()).filter(Boolean).map((s: string) => {
                          const [lvl, ...rest] = s.split(':');
                          const label = rest.join(':').trim();
                          const color = lvl === 'SD' ? 'bg-orange-50 text-orange-700' : lvl === 'SMP' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700';
                          return <span key={s} className={`px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>{label || s}</span>;
                        })}
                      </div>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${g.user?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {g.user?.is_active ? '● Aktif' : '● Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(g)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setHapusId(g.id); setHapusNama(g.user?.nama || ''); }}
                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Trash2 size={14} className="inline mr-1" />Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">{pagination.total} guru</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">← Prev</button>
                <span className="px-3 py-1.5 bg-[#3B7FD1] text-white rounded-lg text-sm">{page}</span>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Konfirmasi Hapus */}
      {hapusId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Hapus Guru?</h3>
              <p className="text-sm text-gray-500 mt-1 font-semibold">{hapusNama}</p>
              <p className="text-xs text-red-500 mt-2">Akun login guru ini juga akan dihapus permanen.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setHapusId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Batal
              </button>
              <button onClick={() => deleteMut.mutate(hapusId)} disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Tambah / Edit Guru ===== */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#3B7FD1] to-blue-500 rounded-t-2xl p-5 text-white sticky top-0">
              <h3 className="font-bold text-lg">{modal === 'create' ? 'Tambah Guru Baru' : 'Edit Data Guru'}</h3>
              <p className="text-blue-100 text-sm mt-0.5">
                {modal === 'create' ? 'Isi data guru dan tentukan jenjang mengajar' : `Edit: ${editTarget?.user?.nama}`}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap <span className="text-red-400">*</span></label>
                <input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
                  placeholder="Contoh: Budi Santoso S.Pd" />
                <p className="text-xs text-gray-400 mt-1">Huruf kapital setiap kata — cth: Siti Rahmawati</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value.trim().toLowerCase().replace(/[@\s]/g, '') }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
                  placeholder="nama.guru"
                />
                <p className="text-xs text-blue-500 mt-1">Otomatis huruf kecil semua — cth: budi.santoso</p>
              </div>

              {/* Password (hanya saat create) */}
              {modal === 'create' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
                      placeholder="Min. 6 karakter (default: 12345678)" />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}


              {/* Spesialisasi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Spesialisasi / Mata Pelajaran</label>
                {(() => {
                  const jenjangKeys = LEVELS.filter(l => mapelByJenjang[l]?.length > 0);
                  const checkedSet = new Set(form.spesialisasi ? form.spesialisasi.split(',').map(s => s.trim()).filter(Boolean) : []);
                  const key = (level: string, m: string) => `${level}:${m}`;
                  const toggleMapel = (level: string, m: string) => {
                    const k = key(level, m);
                    const next = new Set(checkedSet);
                    next.has(k) ? next.delete(k) : next.add(k);
                    setForm(f => ({ ...f, spesialisasi: Array.from(next).join(', ') }));
                  };
                  if (jenjangKeys.length === 0) return <p className="text-sm text-gray-400 italic">Belum ada mata pelajaran. Tambah mata pelajaran dulu.</p>;
                  return (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {jenjangKeys.map((level, li) => {
                        const mapels = mapelByJenjang[level];
                        return (
                          <div key={level} className={li > 0 ? 'border-t border-gray-100' : ''}>
                            <div className="px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: LEVEL_COLOR[level] || '#888' }}>
                              {level}
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2">
                              {mapels.map(m => (
                                <label key={m} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                                  <input type="checkbox" checked={checkedSet.has(key(level, m))} onChange={() => toggleMapel(level, m)}
                                    className="rounded border-gray-300 text-[#3B7FD1] focus:ring-[#3B7FD1]" />
                                  {m}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Jenjang Mengajar */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jenjang Mengajar <span className="text-red-400">*</span></label>
                {!user?.school_level && <p className="text-xs text-gray-400 mb-3">Pilih satu atau lebih jenjang yang diajar. Guru yang mengajar di semua jenjang disebut Guru Gabungan.</p>}
                <div className="grid grid-cols-3 gap-2">
                  {(user?.school_level ? [user.school_level] : LEVELS).map(level => {
                    const selected = form.school_levels.includes(level);
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel(level)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${selected ? 'text-white border-transparent' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                        style={selected ? { backgroundColor: LEVEL_COLOR[level], borderColor: LEVEL_COLOR[level] } : {}}
                      >
                        <p className="font-bold text-lg">{level}</p>
                        <p className={`text-xs mt-0.5 ${selected ? 'text-white/80' : 'text-gray-400'}`}>
                          {level === 'SD' ? 'Sekolah Dasar' : level === 'SMP' ? 'Sekolah Menengah Pertama' : 'Sekolah Menengah Atas'}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Preview badge */}
                {form.school_levels.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <span>Tipe:</span>
                    {form.school_levels.length === 3 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-gradient-to-r from-[#F97316] via-[#2563EB] to-[#7C3AED]">
                        🎓 Guru Gabungan (semua jenjang)
                      </span>
                    ) : form.school_levels.length > 1 ? (
                      <span className="text-xs text-gray-500">Guru Gabungan ({form.school_levels.join(' + ')})</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: LEVEL_COLOR[form.school_levels[0]] }}>
                        Guru {form.school_levels[0]}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setModal(null); setEditTarget(null); setForm(emptyForm); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (modal === 'create') createMut.mutate(form);
                    else updateMut.mutate({ id: editTarget.id, f: form });
                  }}
                  disabled={!form.nama || !form.email || (modal === 'create' && !form.password) || createMut.isPending || updateMut.isPending}
                  className="flex-1 px-4 py-2.5 bg-[#3B7FD1] text-white rounded-xl text-sm font-bold hover:bg-[#2d6ab5] disabled:opacity-50"
                >
                  {(createMut.isPending || updateMut.isPending) ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </span>
                  ) : modal === 'create' ? '✓ Tambah Guru' : '✓ Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
