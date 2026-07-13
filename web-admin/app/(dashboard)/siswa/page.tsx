'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const JENJANG = ['SD', 'SMP', 'SMA'] as const;

export default function SiswaPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editSiswa, setEditSiswa] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nama: '', email: '', nisn: '', nis: '', kelas_id: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ nama: '', nisn: '', nis: '', kelas_id: '', jenjang: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['siswa', search, page],
    queryFn: () => api.get('/siswa', { params: { search, page, limit: 20 } }).then(r => r.data),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-all'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const siswaList = data?.data || [];
  const pagination = data?.pagination || {};

  const kelasByJenjang = (jenjang: string) =>
    (kelasList as any[]).filter((k: any) => k.sekolah?.level === jenjang || k.sekolah?.level?.toUpperCase() === jenjang);

  const openEdit = (s: any) => {
    setEditSiswa(s);
    setEditForm({ nama: s.user?.nama || '', email: s.user?.email || '', nisn: s.nisn || '', nis: s.nis || '', kelas_id: s.kelas_id || '' });
  };

  const updateSiswa = useMutation({
    mutationFn: () => api.put(`/siswa/${editSiswa.id}`, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['siswa'] }); setEditSiswa(null); },
  });

  const addSiswa = useMutation({
    mutationFn: () => api.post('/siswa', { ...addForm, role: 'siswa' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siswa'] });
      setShowAdd(false);
      setAddForm({ nama: '', nisn: '', nis: '', kelas_id: '', jenjang: '' });
    },
  });

  const toggleAktif = useMutation({
    mutationFn: (s: any) => api.put(`/siswa/${s.id}`, { is_active: !s.user?.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['siswa'] }),
  });

  return (
    <div>
      <Header title="Manajemen Siswa" />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
          />
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] transition-colors font-medium"
          >
            + Tambah Siswa
          </button>
          <button className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Import CSV
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Nama</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">NISN</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kelas</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Email</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : siswaList.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Tidak ada data siswa</td></tr>
              ) : siswaList.map((siswa: any) => (
                <tr key={siswa.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#3B7FD1]/10 rounded-full flex items-center justify-center text-[#3B7FD1] font-bold text-sm">
                        {siswa.user?.nama?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{siswa.user?.nama}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{siswa.nisn}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {siswa.kelas?.nama}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{siswa.user?.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      siswa.user?.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {siswa.user?.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(siswa)} className="text-[#3B7FD1] hover:underline text-xs">Edit</button>
                      <button
                        onClick={() => toggleAktif.mutate(siswa)}
                        disabled={toggleAktif.isPending}
                        className={`text-xs hover:underline ${siswa.user?.is_active ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {siswa.user?.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Menampilkan {siswaList.length} dari {pagination.total} siswa
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Sebelumnya</button>
                <span className="px-3 py-1 bg-[#3B7FD1] text-white rounded text-sm">{page}</span>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Selanjutnya</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Siswa */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-[#1A2332]">Tambah Siswa Baru</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                <input value={addForm.nama} onChange={e => setAddForm({ ...addForm, nama: e.target.value })}
                  placeholder="Nama lengkap siswa"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                Login: NIS sebagai username · Password: 4 angka terakhir NIS
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NISN</label>
                  <input value={addForm.nisn} onChange={e => setAddForm({ ...addForm, nisn: e.target.value })}
                    placeholder="0012345678"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NIS</label>
                  <input value={addForm.nis} onChange={e => setAddForm({ ...addForm, nis: e.target.value })}
                    placeholder="2024001"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang <span className="text-red-500">*</span></label>
                <select
                  value={addForm.jenjang}
                  onChange={e => setAddForm({ ...addForm, jenjang: e.target.value, kelas_id: '' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Jenjang --</option>
                  {JENJANG.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              {addForm.jenjang && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kelas <span className="text-red-500">*</span></label>
                  <select
                    value={addForm.kelas_id}
                    onChange={e => setAddForm({ ...addForm, kelas_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">-- Pilih Kelas {addForm.jenjang} --</option>
                    {kelasByJenjang(addForm.jenjang).map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                  {kelasByJenjang(addForm.jenjang).length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">Belum ada kelas untuk jenjang {addForm.jenjang}</p>
                  )}
                </div>
              )}
              {addSiswa.isError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {(addSiswa.error as any)?.response?.data?.message || 'Gagal menambah siswa'}
                </p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => addSiswa.mutate()}
                disabled={addSiswa.isPending || !addForm.nama || !addForm.nis || !addForm.kelas_id}
                className="flex-1 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50"
              >
                {addSiswa.isPending ? 'Menyimpan...' : 'Tambah Siswa'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Siswa */}
      {editSiswa && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1A2332]">Edit Siswa</h2>
              <button onClick={() => setEditSiswa(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
                <input value={editForm.nama} onChange={e => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NISN</label>
                  <input value={editForm.nisn} onChange={e => setEditForm({ ...editForm, nisn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NIS</label>
                  <input value={editForm.nis} onChange={e => setEditForm({ ...editForm, nis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
                <select value={editForm.kelas_id} onChange={e => setEditForm({ ...editForm, kelas_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- Pilih Kelas --</option>
                  {(kelasList as any[]).map((k: any) => (
                    <option key={k.id} value={k.id}>{k.sekolah?.level ? `[${k.sekolah.level}] ` : ''}{k.nama}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => updateSiswa.mutate()} disabled={updateSiswa.isPending}
                className="flex-1 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50">
                {updateSiswa.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setEditSiswa(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
