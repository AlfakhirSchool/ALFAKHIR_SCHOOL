'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Kandidat = {
  id: string; nama: string; level: 'SD' | 'SMP' | 'SMA';
  status: 'PENDING' | 'REVIEW' | 'DITERIMA' | 'DITOLAK';
  tahun_ajaran: string; nama_ortu: string | null; no_telp_ortu: string | null;
  asal_sekolah: string | null; skor_akademik: number | null;
  rekomendasi: string | null; pewawancara: { user: { nama: string } } | null;
  created_at: string; siswa_id: string | null;
};
type Stats = { total: number; pending: number; review: number; diterima: number; ditolak: number };

const LEVEL_COLOR: Record<string, string> = { SD: '#F97316', SMP: '#1B8B87', SMA: '#3B82F6' };
const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: '#FEF3C7', text: '#D97706', label: 'Menunggu' },
  REVIEW:   { bg: '#EFF6FF', text: '#2563EB', label: 'Wawancara' },
  DITERIMA: { bg: '#F0FDF4', text: '#16A34A', label: 'Diterima' },
  DITOLAK:  { bg: '#FEF2F2', text: '#DC2626', label: 'Ditolak' },
};

const BLANK = { nama: '', level: 'SMP', nama_ortu: '', no_telp_ortu: '', email_ortu: '', asal_sekolah: '', jenis_kelamin: '', tanggal_lahir: '' };

export default function ObservasiPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const levelFromUser = user?.school_level || '';

  const [filterStatus, setFilterStatus] = useState('');
  const [filterLevel, setFilterLevel] = useState(levelFromUser);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK, level: levelFromUser || 'SMP' });
  const [editTarget, setEditTarget] = useState<Kandidat | null>(null);
  const [daftarModal, setDaftarModal] = useState<Kandidat | null>(null);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [daftarResult, setDaftarResult] = useState<{ email: string; password: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['kandidat', filterStatus, filterLevel],
    queryFn: () => api.get('/kandidat', { params: { status: filterStatus || undefined, level: filterLevel || undefined, limit: 100 } }).then(r => r.data),
  });

  const kandidatList: Kandidat[] = data?.data || [];
  const stats: Stats = data?.stats || { total: 0, pending: 0, review: 0, diterima: 0, ditolak: 0 };

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-modal', daftarModal?.level],
    queryFn: () => api.get('/kelas', { params: { jenjang: daftarModal?.level, limit: 100 } }).then(r => r.data.data || []),
    enabled: !!daftarModal,
  });

  const { data: guruList } = useQuery({
    queryKey: ['guru-pewawancara', filterLevel || levelFromUser],
    queryFn: () => api.get('/guru', { params: { jenjang: filterLevel || levelFromUser || undefined, limit: 100 } }).then(r => r.data.data || []),
    enabled: !!editTarget,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/kandidat', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kandidat'] }); setShowForm(false); setForm({ ...BLANK, level: levelFromUser || 'SMP' }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/kandidat/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kandidat'] }); setEditTarget(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/kandidat/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kandidat'] }),
  });

  const daftarkanMut = useMutation({
    mutationFn: ({ id, kelas_id }: any) => api.post(`/kandidat/${id}/daftarkan`, { kelas_id }),
    onSuccess: (res) => { setDaftarResult(res.data); qc.invalidateQueries({ queryKey: ['kandidat'] }); },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Penerimaan Siswa Baru" />
      <div className="p-6 max-w-6xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: '#6B7280' },
            { label: 'Menunggu', value: stats.pending, color: '#D97706' },
            { label: 'Wawancara', value: stats.review, color: '#2563EB' },
            { label: 'Diterima', value: stats.diterima, color: '#16A34A' },
            { label: 'Ditolak', value: stats.ditolak, color: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="REVIEW">Wawancara</option>
              <option value="DITERIMA">Diterima</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
            {!levelFromUser && (
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Semua Jenjang</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            )}
          </div>
          <button onClick={() => { setShowForm(true); setEditTarget(null); }}
            className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-teal-700">
            + Tambah Kandidat
          </button>
        </div>

        {/* Form tambah */}
        {showForm && !editTarget && (
          <div className="bg-white rounded-xl border border-teal-200 p-5 mb-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Tambah Kandidat Baru</h3>
            <KandidatForm form={form} setForm={setForm} levelFromUser={levelFromUser} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => createMut.mutate(form)} disabled={!form.nama || createMut.isPending}
                className="px-5 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {createMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* Edit inline */}
        {editTarget && (
          <div className="bg-white rounded-xl border border-amber-300 p-5 mb-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Edit: {editTarget.nama}</h3>
            <KandidatForm form={form} setForm={setForm} levelFromUser={levelFromUser} guruList={guruList || []} showPewawancara />
            <div className="flex gap-2 mt-4">
              <button onClick={() => updateMut.mutate({ id: editTarget.id, data: form })} disabled={updateMut.isPending}
                className="px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setEditTarget(null)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Memuat...</p>
            </div>
          ) : kandidatList.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm text-gray-500">Belum ada kandidat</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nama</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jenjang</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Orang Tua</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Asal Sekolah</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kandidatList.map((k) => {
                  const st = STATUS_COLOR[k.status];
                  return (
                    <tr key={k.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{k.nama}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: LEVEL_COLOR[k.level] }}>
                          {k.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <p>{k.nama_ortu || '—'}</p>
                        {k.no_telp_ortu && <p className="text-gray-400">{k.no_telp_ortu}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{k.asal_sekolah || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: st.bg, color: st.text }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => {
                            setEditTarget(k);
                            setForm({ nama: k.nama, level: k.level, nama_ortu: k.nama_ortu || '', no_telp_ortu: k.no_telp_ortu || '', email_ortu: '', asal_sekolah: k.asal_sekolah || '', jenis_kelamin: '', tanggal_lahir: '' } as any);
                            setShowForm(false);
                          }} className="text-xs text-amber-600 hover:underline">Edit</button>
                          {k.status === 'DITERIMA' && !k.siswa_id && (
                            <button onClick={() => { setDaftarModal(k); setSelectedKelas(''); setDaftarResult(null); }}
                              className="text-xs bg-teal-600 text-white px-2 py-1 rounded hover:bg-teal-700 font-medium">
                              Daftarkan
                            </button>
                          )}
                          {!k.siswa_id && (
                            <button onClick={() => { if (confirm('Hapus kandidat ini?')) deleteMut.mutate(k.id); }}
                              className="text-xs text-red-500 hover:underline">Hapus</button>
                          )}
                          {k.siswa_id && <span className="text-xs text-green-600 font-medium">✓ Terdaftar</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal daftarkan */}
      {daftarModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Daftarkan sebagai Siswa</h2>
              <p className="text-sm text-gray-500 mt-0.5">{daftarModal.nama} · {daftarModal.level}</p>
            </div>
            <div className="p-5">
              {daftarResult ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-700 mb-2">✓ Berhasil didaftarkan!</p>
                  <p className="text-xs text-gray-600">Email: <span className="font-mono font-medium">{daftarResult.email}</span></p>
                  <p className="text-xs text-gray-600 mt-1">Password: <span className="font-mono font-medium">{daftarResult.password}</span></p>
                  <p className="text-xs text-gray-400 mt-2">Simpan dan bagikan ke siswa/wali.</p>
                </div>
              ) : (
                <>
                  <label className="text-sm text-gray-600 font-medium block mb-1.5">Pilih Kelas</label>
                  <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">— Pilih kelas —</option>
                    {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama} ({k.tahun_ajaran})</option>)}
                  </select>
                  {(kelasList || []).length === 0 && <p className="text-xs text-amber-600 mt-1.5">Belum ada kelas untuk {daftarModal.level}.</p>}
                </>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => { setDaftarModal(null); setDaftarResult(null); }}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                {daftarResult ? 'Tutup' : 'Batal'}
              </button>
              {!daftarResult && (
                <button onClick={() => daftarkanMut.mutate({ id: daftarModal.id, kelas_id: selectedKelas })}
                  disabled={!selectedKelas || daftarkanMut.isPending}
                  className="text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 font-medium">
                  {daftarkanMut.isPending ? 'Memproses...' : 'Daftarkan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KandidatForm({ form, setForm, levelFromUser, guruList, showPewawancara }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap *</label>
        <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang *</label>
        <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
          disabled={!!levelFromUser}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50">
          <option value="SD">SD</option>
          <option value="SMP">SMP</option>
          <option value="SMA">SMA</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Orang Tua</label>
        <input value={form.nama_ortu} onChange={e => setForm({ ...form, nama_ortu: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">No. HP Orang Tua</label>
        <input value={form.no_telp_ortu} onChange={e => setForm({ ...form, no_telp_ortu: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Asal Sekolah</label>
        <input value={form.asal_sekolah} onChange={e => setForm({ ...form, asal_sekolah: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Kelamin</label>
        <select value={form.jenis_kelamin} onChange={e => setForm({ ...form, jenis_kelamin: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
          <option value="">— Pilih —</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>
      {showPewawancara && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
              <option value="PENDING">Menunggu</option>
              <option value="REVIEW">Wawancara</option>
              <option value="DITERIMA">Diterima</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pewawancara</label>
            <select value={form.pewawancara_id || ''} onChange={e => setForm({ ...form, pewawancara_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
              <option value="">— Pilih Guru —</option>
              {(guruList || []).map((g: any) => <option key={g.id} value={g.id}>{g.user?.nama}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
            <textarea value={form.catatan || ''} onChange={e => setForm({ ...form, catatan: e.target.value })} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
          </div>
        </>
      )}
    </div>
  );
}
