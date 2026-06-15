'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function KelasPage() {
  const qc = useQueryClient();
  const [selectedKelas, setSelectedKelas] = useState<any>(null);
  const [filterJenjang, setFilterJenjang] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: '', tingkat: '', sekolah_id: '', wali_kelas_id: '', tahun_ajaran: '2024/2025' });

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
    enabled: showForm,
  });

  const addKelas = useMutation({
    mutationFn: () => api.post('/kelas', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kelas-admin'] }); setShowForm(false); setForm({ nama: '', tingkat: '', sekolah_id: '', wali_kelas_id: '', tahun_ajaran: '2024/2025' }); },
  });

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
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] font-medium text-sm">
            + Tambah Kelas
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#3B7FD1]/20">
            <h3 className="font-semibold text-[#1A2332] mb-4">Tambah Kelas Baru</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Kelas</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: 10A" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tingkat</label>
                <input value={form.tingkat} onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
                  placeholder="Contoh: 10" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tahun Ajaran</label>
                <input value={form.tahun_ajaran} onChange={(e) => setForm({ ...form, tahun_ajaran: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Wali Kelas</label>
                <select value={form.wali_kelas_id} onChange={(e) => setForm({ ...form, wali_kelas_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- Pilih Guru --</option>
                  {(guruList || []).map((g: any) => <option key={g.id} value={g.id}>{g.user?.nama}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => addKelas.mutate()} disabled={!form.nama || addKelas.isPending}
                className="px-5 py-2 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50">
                {addKelas.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {isLoading && <div className="col-span-3 text-center py-8 text-gray-400">Memuat...</div>}
          {(kelasList || []).map((k: any) => (
            <button key={k.id} onClick={() => setSelectedKelas(selectedKelas?.id === k.id ? null : k)}
              className={`bg-white rounded-xl shadow-sm p-5 text-left transition-all border-2 ${selectedKelas?.id === k.id ? 'border-[#3B7FD1]' : 'border-transparent hover:border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#3B7FD1]/10 rounded-lg flex items-center justify-center text-[#3B7FD1] font-bold text-lg">
                  {k.tingkat}
                </div>
                <div>
                  <p className="font-semibold text-[#1A2332]">{k.nama}</p>
                  <p className="text-xs text-gray-400">{k.sekolah?.nama || 'Al Fakhir'}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Wali Kelas: {k.waliKelas?.user?.nama || '-'}</p>
                <p>Tahun Ajaran: {k.tahun_ajaran}</p>
              </div>
            </button>
          ))}
        </div>

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
    </div>
  );
}
