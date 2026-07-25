'use client';

import { useState } from 'react';
import { Pencil, Trash2, Lock, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const BLANK_FORM = { nama: '', tingkat: '', sekolah_id: '', wali_kelas_id: '', tahun_ajaran: '2025/2026' };

export default function KelasPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isMaster = !user?.school_level;

  const [selectedKelas, setSelectedKelas] = useState<any>(null);
  const [filterJenjang, setFilterJenjang] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  // Delete request modal
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');

  const { data: kelasList, isLoading } = useQuery({
    queryKey: ['kelas-admin', filterJenjang],
    queryFn: () => api.get('/kelas', { params: filterJenjang ? { jenjang: filterJenjang } : {} }).then(r => r.data.data || []),
  });

  const { data: siswaData } = useQuery({
    queryKey: ['siswa-kelas-admin', selectedKelas?.id],
    queryFn: () => api.get(`/kelas/${selectedKelas.id}/siswa`).then(r => r.data.data || []),
    enabled: !!selectedKelas,
  });

  const { data: guruList } = useQuery({
    queryKey: ['guru-list'],
    queryFn: () => api.get('/guru').then(r => r.data.data || []),
    enabled: showForm || !!editTarget,
  });

  const addKelas = useMutation({
    mutationFn: () => api.post('/kelas', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kelas-admin'] });
      setShowForm(false);
      setForm({ ...BLANK_FORM });
    },
  });

  const editKelas = useMutation({
    mutationFn: () => api.put(`/kelas/${editTarget.id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kelas-admin'] });
      setEditTarget(null);
      setForm({ ...BLANK_FORM });
    },
  });

  const deleteKelas = useMutation({
    mutationFn: (id: string) => api.delete(`/kelas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kelas-admin'] });
      if (selectedKelas?.id === deleteTarget?.id) setSelectedKelas(null);
      setDeleteTarget(null);
    },
  });

  const requestDelete = useMutation({
    mutationFn: () => api.post('/delete-requests', {
      resource_type: 'kelas',
      resource_id: deleteTarget.id,
      resource_name: `Kelas ${deleteTarget.nama}`,
      reason: deleteReason,
    }),
    onSuccess: (res) => {
      setDeleteMsg(res.data.message);
      setDeleteReason('');
    },
    onError: (err: any) => {
      setDeleteMsg(err.response?.data?.message || 'Gagal mengirim permintaan');
    },
  });

  const openEdit = (k: any) => {
    setEditTarget(k);
    setForm({
      nama: k.nama,
      tingkat: String(k.tingkat),
      sekolah_id: k.sekolah_id || k.sekolah?.id || '',
      wali_kelas_id: k.wali_kelas_id || k.waliKelas?.id || '',
      tahun_ajaran: k.tahun_ajaran,
    });
    setShowForm(false);
  };

  const openDeleteModal = (k: any) => {
    setDeleteTarget(k);
    setDeleteReason('');
    setDeleteMsg('');
  };

  return (
    <div>
      <Header title="Manajemen Kelas" />
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          <select value={filterJenjang} onChange={(e) => setFilterJenjang(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1] text-sm">
            <option value="">Semua Jenjang</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
          </select>
          <button onClick={() => { setShowForm(!showForm); setEditTarget(null); setForm({ ...BLANK_FORM }); }}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] font-medium text-sm">
            + Tambah Kelas
          </button>
        </div>

        {/* Form tambah */}
        {showForm && !editTarget && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#3B7FD1]/20">
            <h3 className="font-semibold text-[#1A2332] mb-4">Tambah Kelas Baru</h3>
            <KelasForm form={form} setForm={setForm} guruList={guruList || []} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => addKelas.mutate()} disabled={!form.nama || addKelas.isPending}
                className="px-5 py-2 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50">
                {addKelas.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* Form edit */}
        {editTarget && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-amber-300">
            <div className="flex items-center gap-2 mb-4">
              <Pencil size={16} className="text-amber-500" />
              <h3 className="font-semibold text-[#1A2332]">Edit Kelas: {editTarget.nama}</h3>
            </div>
            <KelasForm form={form} setForm={setForm} guruList={guruList || []} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => editKelas.mutate()} disabled={!form.nama || editKelas.isPending}
                className="px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                {editKelas.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button onClick={() => setEditTarget(null)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* Daftar kelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {isLoading && <div className="col-span-3 text-center py-8 text-gray-400">Memuat...</div>}
          {(kelasList || []).map((k: any) => (
            <div key={k.id} className={`bg-white rounded-xl shadow-sm border-2 transition-all ${selectedKelas?.id === k.id ? 'border-[#3B7FD1]' : 'border-transparent hover:border-gray-200'}`}>
              <button className="w-full p-5 text-left" onClick={() => setSelectedKelas(selectedKelas?.id === k.id ? null : k)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#3B7FD1]/10 rounded-lg flex items-center justify-center text-[#3B7FD1] font-bold text-lg">
                    {k.tingkat}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A2332]">{k.nama}</p>
                    <p className="text-xs text-gray-400">{k.sekolah?.nama || '-'}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Wali Kelas: {k.waliKelas?.user?.nama || '-'}</p>
                  <p>Tahun Ajaran: {k.tahun_ajaran}</p>
                </div>
              </button>
              {/* Aksi edit/hapus */}
              <div className="px-5 pb-4 flex gap-2">
                <button onClick={() => openEdit(k)}
                  className="flex-1 px-3 py-1.5 text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                  <Pencil size={12} className="inline mr-1" />Edit
                </button>
                {isMaster ? (
                  <button onClick={() => openDeleteModal(k)}
                    className="flex-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition-colors">
                    <Trash2 size={12} className="inline mr-1" />Hapus
                  </button>
                ) : (
                  <button onClick={() => openDeleteModal(k)}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 font-medium transition-colors">
                    <Lock size={12} className="inline mr-1" />Minta Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Daftar siswa */}
        {selectedKelas && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-[#1A2332]">Siswa Kelas {selectedKelas.nama} ({(siswaData || []).length} siswa)</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">No</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Nama</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">NISN</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(siswaData || []).map((s: any, i: number) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-6 py-3 font-medium text-gray-800">{s.user?.nama}</td>
                    <td className="px-6 py-3 text-gray-500">{s.nisn || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.user?.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {s.user?.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal hapus / minta hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {deleteMsg ? (
              <div className="text-center py-4">
                <div className="mb-3 flex justify-center"><CheckCircle size={40} className="text-green-500" /></div>
                <p className="font-semibold text-[#1A2332] mb-2">Permintaan Terkirim</p>
                <p className="text-sm text-gray-500 mb-5">{deleteMsg}</p>
                <button onClick={() => { setDeleteTarget(null); setDeleteMsg(''); }}
                  className="px-6 py-2.5 bg-[#3B7FD1] text-white rounded-lg font-medium">
                  Tutup
                </button>
              </div>
            ) : isMaster ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600"><Trash2 size={20} /></div>
                  <div>
                    <p className="font-bold text-[#1A2332]">Hapus Kelas</p>
                    <p className="text-sm text-gray-500">{deleteTarget.nama}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-5">
                  Yakin ingin menghapus kelas <strong>{deleteTarget.nama}</strong>? Data siswa yang terkait tidak akan ikut terhapus, hanya referensi kelasnya.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => deleteKelas.mutate(deleteTarget.id)} disabled={deleteKelas.isPending}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                    {deleteKelas.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><Lock size={20} /></div>
                  <div>
                    <p className="font-bold text-[#1A2332]">Minta Verifikasi ke Feri</p>
                    <p className="text-sm text-gray-500">Hapus: {deleteTarget.nama}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Penghapusan data hanya bisa dilakukan setelah disetujui oleh <strong>Feri (Admin Master)</strong>.
                  Permintaan ini akan muncul di dashboard Feri untuk ditinjau.
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alasan Penghapusan <span className="text-gray-400">(opsional)</span></label>
                  <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3}
                    placeholder="Contoh: Data kelas ini salah input, sudah tidak digunakan..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none" />
                </div>
                {requestDelete.isError && (
                  <p className="text-xs text-red-600 mb-3">{(requestDelete.error as any)?.response?.data?.message}</p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => requestDelete.mutate()} disabled={requestDelete.isPending}
                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50">
                    {requestDelete.isPending ? 'Mengirim...' : 'Kirim Permintaan ke Feri'}
                  </button>
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KelasForm({ form, setForm, guruList }: { form: any; setForm: any; guruList: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Kelas</label>
        <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
          placeholder="Contoh: 1A An Na'im"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tingkat</label>
        <input value={form.tingkat} onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
          placeholder="Contoh: 1"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tahun Ajaran</label>
        <input value={form.tahun_ajaran} onChange={(e) => setForm({ ...form, tahun_ajaran: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
      </div>
      <div className="col-span-2 md:col-span-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Wali Kelas</label>
        <select value={form.wali_kelas_id} onChange={(e) => setForm({ ...form, wali_kelas_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
          <option value="">-- Pilih Guru --</option>
          {guruList.map((g: any) => <option key={g.id} value={g.id}>{g.user?.nama}</option>)}
        </select>
      </div>
    </div>
  );
}
