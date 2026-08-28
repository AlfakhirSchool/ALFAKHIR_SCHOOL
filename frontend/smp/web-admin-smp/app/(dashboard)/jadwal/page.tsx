'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ALL_JENJANG = ['SD', 'SMP'] as const;
const JENJANG_COLOR: Record<string, { active: string; passive: string }> = {
  SD:  { active: 'bg-orange-500 text-white', passive: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
  SMP: { active: 'bg-[#1B8B87] text-white',  passive: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
  SMA: { active: 'bg-blue-600 text-white',    passive: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
};

export default function JadwalPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isMaster = !user?.school_level;
  const JENJANG = user?.school_level ? [user.school_level] : [...ALL_JENJANG];

  const [activeJenjang, setActiveJenjang] = useState(JENJANG[0]);
  const [filterKelas, setFilterKelas] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kelas_id: '', guru_id: '', mata_pelajaran_id: '',
    hari: 'Senin', jam_mulai: '07:00', jam_selesai: '08:30'
  });
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [hapusInfo, setHapusInfo] = useState<string>('');

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-jadwal-admin', activeJenjang],
    queryFn: () => api.get('/kelas', { params: { jenjang: activeJenjang } }).then((r: any) => r.data.data || []),
  });

  const selectedKelasData = (kelasList || []).find((k: any) => k.id === form.kelas_id);
  const kelasJenjang = selectedKelasData?.sekolah?.level || activeJenjang;

  const { data: guruList } = useQuery({
    queryKey: ['guru-jadwal-admin', kelasJenjang],
    queryFn: () => api.get('/guru', { params: { jenjang: kelasJenjang, limit: 100 } }).then((r: any) => r.data.data || []),
    enabled: showForm,
  });

  const { data: mapelList } = useQuery({
    queryKey: ['mapel-all'],
    queryFn: () => api.get('/mata-pelajaran').then((r: any) => r.data.data || []),
  });

  const { data: jadwalList, isLoading } = useQuery({
    queryKey: ['jadwal-admin', activeJenjang, filterKelas],
    queryFn: () => api.get('/jadwal-pelajaran', {
      params: filterKelas ? { kelas_id: filterKelas } : { jenjang: activeJenjang },
    }).then((r: any) => r.data.data || []),
  });

  const addJadwal = useMutation({
    mutationFn: () => api.post('/jadwal-pelajaran', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jadwal-admin'] });
      setShowForm(false);
      setFilterKelas('');
      setForm({ kelas_id: '', guru_id: '', mata_pelajaran_id: '', hari: 'Senin', jam_mulai: '07:00', jam_selesai: '08:30' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/jadwal-pelajaran/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jadwal-admin'] }); setHapusId(null); },
  });

  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = (jadwalList || []).filter((j: any) => j.hari === day);
    return acc;
  }, {} as Record<string, any[]>);

  const color = JENJANG_COLOR[activeJenjang] || JENJANG_COLOR.SMP;

  return (
    <div>
      <Header title="Jadwal Pelajaran" />
      <div className="p-6">

        {/* Tabs jenjang — master admin saja */}
        {isMaster && (
          <div className="flex flex-wrap gap-2 mb-5">
            {ALL_JENJANG.map(j => (
              <button key={j} onClick={() => { setActiveJenjang(j); setFilterKelas(''); }}
                className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeJenjang === j ? JENJANG_COLOR[j].active : JENJANG_COLOR[j].passive}`}>
                {j}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-4 mb-6 flex-wrap">
          <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none text-sm min-w-[180px]">
            <option value="">Semua Kelas {activeJenjang}</option>
            {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <button onClick={() => { setShowForm(!showForm); setForm({ kelas_id: '', guru_id: '', mata_pelajaran_id: '', hari: 'Senin', jam_mulai: '07:00', jam_selesai: '08:30' }); }}
            className={`px-4 py-2.5 text-white rounded-lg font-medium text-sm ${color.active}`}>
            + Tambah Jadwal
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <h3 className="font-semibold text-[#1A2332] mb-4">Tambah Jadwal — {activeJenjang}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
                <select value={form.kelas_id} onChange={(e) => setForm({ ...form, kelas_id: e.target.value, guru_id: '' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- Pilih Kelas --</option>
                  {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Guru</label>
                <select value={form.guru_id} onChange={(e) => setForm({ ...form, guru_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- Pilih Guru --</option>
                  {(guruList || []).map((g: any) => <option key={g.id} value={g.id}>{g.user?.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran</label>
                <select value={form.mata_pelajaran_id} onChange={(e) => setForm({ ...form, mata_pelajaran_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- Pilih Mapel --</option>
                  {(mapelList || []).map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hari</label>
                <select value={form.hari} onChange={(e) => setForm({ ...form, hari: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jam Mulai</label>
                <input type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jam Selesai</label>
                <input type="time" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => addJadwal.mutate()} disabled={!form.kelas_id || !form.guru_id || addJadwal.isPending}
                className={`px-5 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${color.active}`}>
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
                  <div className="px-6 py-3 border-b border-gray-100" style={{ background: `color-mix(in srgb, currentColor 5%, white)` }}>
                    <h3 className={`font-semibold text-sm ${activeJenjang === 'SD' ? 'text-orange-600' : activeJenjang === 'SMA' ? 'text-blue-600' : 'text-[#1B8B87]'}`}>{day}</h3>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="min-w-[600px] w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {items.sort((a: any, b: any) => a.jam_mulai.localeCompare(b.jam_mulai)).map((j: any) => (
                        <tr key={j.id} className="hover:bg-gray-50/50">
                          <td className={`px-6 py-3 font-medium w-28 ${activeJenjang === 'SD' ? 'text-orange-600' : activeJenjang === 'SMA' ? 'text-blue-600' : 'text-[#1B8B87]'}`}>{j.jam_mulai}–{j.jam_selesai}</td>
                          <td className="px-6 py-3 font-medium text-gray-800">{j.mata_pelajaran?.nama}</td>
                          <td className="px-6 py-3 text-gray-500">{j.kelas?.nama}</td>
                          <td className="px-6 py-3 text-gray-500">{j.guru?.user?.nama}</td>
                          <td className="px-6 py-3">
                            <button
                              onClick={() => { setHapusId(j.id); setHapusInfo(`${j.mata_pelajaran?.nama} — ${j.kelas?.nama} (${j.hari} ${j.jam_mulai})`); }}
                              className="text-red-500 hover:underline text-xs">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              );
            })}
            {(jadwalList || []).length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <p className="text-gray-400">Belum ada jadwal untuk {activeJenjang}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {hapusId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Hapus Jadwal?</h3>
              <p className="text-sm text-gray-500 mt-1">{hapusInfo}</p>
              <p className="text-xs text-red-500 mt-2">Data yang dihapus tidak bisa dikembalikan.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setHapusId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={() => deleteMut.mutate(hapusId!)} disabled={deleteMut.isPending}
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
