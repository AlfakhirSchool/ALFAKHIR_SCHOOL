'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalPage() {
  const qc = useQueryClient();
  const [filterKelas, setFilterKelas] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kelas_id: '', guru_id: '', mata_pelajaran_id: '',
    hari: 'Senin', jam_mulai: '07:00', jam_selesai: '08:30', ruangan: ''
  });
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [hapusInfo, setHapusInfo] = useState<string>('');

  const { data: kelasList } = useQuery({ queryKey: ['kelas-all'], queryFn: () => api.get('/kelas').then(r => r.data.data || []) });
  const { data: guruList } = useQuery({ queryKey: ['guru-all'], queryFn: () => api.get('/guru').then(r => r.data.data || []) });
  const { data: mapelList } = useQuery({ queryKey: ['mapel-all'], queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data || []) });

  const { data: jadwalList, isLoading } = useQuery({
    queryKey: ['jadwal-admin', filterKelas],
    queryFn: () => api.get('/jadwal-pelajaran', { params: filterKelas ? { kelas_id: filterKelas } : {} }).then(r => r.data.data || []),
  });

  const addJadwal = useMutation({
    mutationFn: () => api.post('/jadwal-pelajaran', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jadwal-admin'] }); setShowForm(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/jadwal-pelajaran/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jadwal-admin'] }); setHapusId(null); },
  });

  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = (jadwalList || []).filter((j: any) => j.hari === day);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div>
      <Header title="Jadwal Pelajaran" />
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1] text-sm">
            <option value="">Semua Kelas</option>
            {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] font-medium text-sm">
            + Tambah Jadwal
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#3B7FD1]/20">
            <h3 className="font-semibold text-[#1A2332] mb-4">Tambah Jadwal</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Kelas', key: 'kelas_id', opts: kelasList || [], nameKey: 'nama' },
                { label: 'Guru', key: 'guru_id', opts: guruList || [], nameKey: 'user.nama' },
                { label: 'Mata Pelajaran', key: 'mata_pelajaran_id', opts: mapelList || [], nameKey: 'nama' },
              ].map(({ label, key, opts, nameKey }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <select value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]">
                    <option value="">-- {label} --</option>
                    {opts.map((o: any) => <option key={o.id} value={o.id}>{nameKey.includes('.') ? o.user?.nama : o[nameKey]}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hari</label>
                <select value={form.hari} onChange={(e) => setForm({ ...form, hari: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jam Mulai</label>
                <input type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jam Selesai</label>
                <input type="time" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ruangan</label>
                <input value={form.ruangan} onChange={(e) => setForm({ ...form, ruangan: e.target.value })}
                  placeholder="Contoh: R.01" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => addJadwal.mutate()} disabled={!form.kelas_id || addJadwal.isPending}
                className="px-5 py-2 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {addJadwal.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Memuat jadwal...</div>
        ) : (
          <div className="space-y-4">
            {DAYS.map(day => {
              const items = byDay[day];
              if (!items || items.length === 0) return null;
              return (
                <div key={day} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-[#3B7FD1]/5 border-b border-[#3B7FD1]/10">
                    <h3 className="font-semibold text-[#3B7FD1]">{day}</h3>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {items.sort((a: any, b: any) => a.jam_mulai.localeCompare(b.jam_mulai)).map((j: any) => (
                        <tr key={j.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3 text-[#3B7FD1] font-medium w-28">{j.jam_mulai}–{j.jam_selesai}</td>
                          <td className="px-6 py-3 font-medium text-gray-800">{j.mataPelajaran?.nama}</td>
                          <td className="px-6 py-3 text-gray-500">{j.kelas?.nama}</td>
                          <td className="px-6 py-3 text-gray-500">{j.guru?.user?.nama}</td>
                          <td className="px-6 py-3 text-gray-400">Ruang {j.ruangan}</td>
                          <td className="px-6 py-3">
                            <div className="flex gap-2">
                              <button className="text-[#3B7FD1] hover:underline text-xs">Edit</button>
                              <button
                                onClick={() => { setHapusId(j.id); setHapusInfo(`${j.mataPelajaran?.nama} — ${j.kelas?.nama} (${j.hari} ${j.jam_mulai})`); }}
                                className="text-red-500 hover:underline text-xs">Hapus</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            {(jadwalList || []).length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <p className="text-gray-400">Belum ada jadwal pelajaran</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Konfirmasi Hapus */}
      {hapusId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Hapus Jadwal?</h3>
              <p className="text-sm text-gray-500 mt-1">{hapusInfo}</p>
              <p className="text-xs text-red-500 mt-2">Data yang dihapus tidak bisa dikembalikan.</p>
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
    </div>
  );
}
