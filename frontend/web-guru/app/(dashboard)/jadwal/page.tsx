'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const emptyForm = { kelas_id: '', mata_pelajaran_id: '', hari: 'Senin', jam_mulai: '', jam_selesai: '' };

function getJenjang(j: any): string {
  return j.kelas?.sekolah?.level || '';
}

export default function JadwalPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [activeJenjang, setActiveJenjang] = useState<string>('Semua');
  const [jenjangInit, setJenjangInit] = useState(false);

  const { data: jadwalList = [], isLoading } = useQuery({
    queryKey: ['jadwal-guru-all'],
    queryFn: () => api.get('/jadwal-pelajaran').then(r => r.data.data || []),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-list', user?.school_levels],
    queryFn: async () => {
      const all: any[] = await api.get('/kelas?all=1').then(r => r.data.data || []);
      const levels = user?.school_levels || [];
      if (levels.length === 0) return all;
      return all.filter((k: any) => levels.includes(k.sekolah?.level));
    },
  });

  const { data: mapelList = [] } = useQuery({
    queryKey: ['mapel-guru'],
    queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data || []),
  });

  // Derive jenjang tabs dari jadwal guru sendiri
  const myJadwal = (jadwalList as any[]).filter((j: any) => j.guru?.user?.nama === user?.nama);
  const myJenjangSet = new Set(myJadwal.map(getJenjang).filter(Boolean));
  const availableTabs = ['Semua', 'SD', 'SMP', 'SMA'].filter(j => j === 'Semua' || myJenjangSet.has(j));

  // Set default tab sekali setelah data load
  if (!jenjangInit && !isLoading && myJenjangSet.size > 0) {
    const single = myJenjangSet.size === 1 ? [...myJenjangSet][0] : 'Semua';
    setActiveJenjang(single);
    setJenjangInit(true);
  }

  // Guru_id milik sendiri — dari jadwal yang sudah ada atau dari profile
  const myGuruId = myJadwal[0]?.guru_id || null;

  const isMyJadwal = (j: any) => j.guru?.user?.nama === user?.nama;

  const save = useMutation({
    mutationFn: () => editId
      ? api.put(`/jadwal-pelajaran/${editId}`, form)
      : api.post('/jadwal-pelajaran', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jadwal-guru-all'] });
      setShowForm(false); setEditId(null); setForm(emptyForm); setErr('');
    },
    onError: (e: any) => setErr(e?.response?.data?.message || 'Gagal menyimpan'),
  });

  const hapus = useMutation({
    mutationFn: (id: string) => api.delete(`/jadwal-pelajaran/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jadwal-guru-all'] }); setHapusId(null); },
  });

  const openEdit = (j: any) => {
    setForm({ kelas_id: j.kelas_id, mata_pelajaran_id: j.mata_pelajaran_id, hari: j.hari, jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai });
    setEditId(j.id); setShowForm(true); setErr('');
  };

  const filteredJadwal = activeJenjang === 'Semua'
    ? (jadwalList as any[]).filter(j => myJenjangSet.size === 0 || myJenjangSet.has(getJenjang(j)))
    : (jadwalList as any[]).filter(j => getJenjang(j) === activeJenjang);

  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = filteredJadwal.filter((j: any) => j.hari === day);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div>
      <Header title="Jadwal Mengajar" />
      <div className="p-6">

        {/* Tab jenjang */}
        <div className="flex gap-2 mb-4">
          {availableTabs.map(j => (
            <button key={j} onClick={() => setActiveJenjang(j)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeJenjang === j ? 'bg-[#1B8B87] text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
              {j}
            </button>
          ))}
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setErr(''); }}
            className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#156f6c]">
            + Tambah Jadwal Saya
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#1B8B87]/20">
            <h3 className="font-semibold text-[#1A2332] mb-4">{editId ? 'Edit' : 'Tambah'} Jadwal</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Hari</label>
                <select value={form.hari} onChange={e => setForm(f => ({ ...f, hari: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Jam Mulai</label>
                <input type="time" value={form.jam_mulai} onChange={e => setForm(f => ({ ...f, jam_mulai: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Jam Selesai</label>
                <input type="time" value={form.jam_selesai} onChange={e => setForm(f => ({ ...f, jam_selesai: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Kelas</label>
                <select value={form.kelas_id} onChange={e => setForm(f => ({ ...f, kelas_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                  <option value="">-- Pilih Kelas --</option>
                  {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Mata Pelajaran</label>
                <select value={form.mata_pelajaran_id} onChange={e => setForm(f => ({ ...f, mata_pelajaran_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                  <option value="">-- Pilih Mapel --</option>
                  {(mapelList as any[]).map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
            </div>
            {err && <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => save.mutate()} disabled={!form.kelas_id || !form.mata_pelajaran_id || !form.jam_mulai || save.isPending}
                className="px-5 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {save.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); setErr(''); }}
                className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* Jadwal per hari */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat jadwal...</div>
        ) : (
          <div className="space-y-4">
            {DAYS.map(day => {
              const items = byDay[day];
              if (items.length === 0) return null;
              return (
                <div key={day} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-[#1B8B87]/5 border-b border-[#1B8B87]/10">
                    <h3 className="font-semibold text-[#1B8B87]">{day}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.sort((a: any, b: any) => a.jam_mulai.localeCompare(b.jam_mulai)).map((j: any) => {
                      const mine = isMyJadwal(j);
                      return (
                        <div key={j.id} className={`flex items-center justify-between px-6 py-4 ${mine ? 'bg-teal-50/30' : ''}`}>
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[80px]">
                              <p className="text-sm font-bold text-[#1B8B87]">{j.jam_mulai}</p>
                              <p className="text-xs text-gray-400">{j.jam_selesai}</p>
                            </div>
                            <div className="w-px h-10 bg-gray-100" />
                            <div>
                              <p className="font-medium text-[#1A2332]">{j.mataPelajaran?.nama || j.mata_pelajaran?.nama}</p>
                              <p className="text-sm text-gray-500">{j.kelas?.nama} · {j.ruangan && `Ruang ${j.ruangan} · `}{j.guru?.user?.nama}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {mine && (
                              <>
                                <button onClick={() => openEdit(j)} className="text-xs text-[#1B8B87] hover:underline">Edit</button>
                                <button onClick={() => setHapusId(j.id)} className="text-xs text-red-500 hover:underline">Hapus</button>
                              </>
                            )}
                            {!mine && <span className="text-xs text-gray-300 italic">—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {(jadwalList as any[]).length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <p className="text-gray-400">Belum ada jadwal. Tambahkan jadwal mengajar Anda.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Konfirmasi hapus */}
      {hapusId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <p className="font-bold text-gray-800 mb-2">Hapus jadwal ini?</p>
            <p className="text-xs text-red-500 mb-5">Data absensi terkait juga akan terhapus.</p>
            <div className="flex gap-3">
              <button onClick={() => setHapusId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={() => hapus.mutate(hapusId)} disabled={hapus.isPending}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {hapus.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
