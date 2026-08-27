'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, ClipboardList, UserX, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import { api } from '@/lib/api';

interface SiswaTerlambat { nama: string; kelas: string; jam: string; }
interface GuruTidakMasuk { nama: string; mata_pelajaran: string; keterangan: string; }

const emptyForm = {
  tanggal: new Date().toISOString().split('T')[0],
  keadaan_kbm: '', catatan: '',
};

export default function AgendaPiketPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [siswaTerlambat, setSiswaTerlambat] = useState<SiswaTerlambat[]>([]);
  const [guruTidakMasuk, setGuruTidakMasuk] = useState<GuruTidakMasuk[]>([]);
  const [newSiswa, setNewSiswa] = useState<SiswaTerlambat>({ nama: '', kelas: '', jam: '' });
  const [newGuru, setNewGuru] = useState<GuruTidakMasuk>({ nama: '', mata_pelajaran: '', keterangan: '' });

  const { data: agendaData, isLoading } = useQuery({
    queryKey: ['agenda-piket'],
    queryFn: () => api.get('/agenda-piket').then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => editId ? api.put(`/agenda-piket/${editId}`, data) : api.post('/agenda-piket', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda-piket'] });
      setShowForm(false); setEditId(null); setForm(emptyForm);
      setSiswaTerlambat([]); setGuruTidakMasuk([]);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/agenda-piket/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda-piket'] }),
  });

  const openEdit = (a: any) => {
    setEditId(a.id);
    setForm({ tanggal: a.tanggal, keadaan_kbm: a.keadaan_kbm || '', catatan: a.catatan || '' });
    setSiswaTerlambat(a.siswa_terlambat || []);
    setGuruTidakMasuk(a.guru_tidak_masuk || []);
    setShowForm(true);
  };

  const submit = () => {
    if (!form.tanggal) return;
    createMut.mutate({ ...form, siswa_terlambat: siswaTerlambat, guru_tidak_masuk: guruTidakMasuk });
  };

  const list: any[] = agendaData?.data || [];

  return (
    <div>
      <Header title="Agenda Guru Piket" />
      <div className="p-6 max-w-4xl">

        <div className="flex justify-end mb-5">
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setSiswaTerlambat([]); setGuruTidakMasuk([]); }}
            className="flex items-center gap-2 bg-[#1B8B87] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#166f6c]">
            <Plus size={16} /> Buat Laporan Piket
          </button>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-4">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-[#1A2332]">{editId ? 'Edit' : 'Buat'} Laporan Piket</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Tanggal</label>
                    <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Keadaan KBM</label>
                  <textarea value={form.keadaan_kbm} onChange={e => setForm(f => ({ ...f, keadaan_kbm: e.target.value }))} rows={3}
                    placeholder="Kondisi kegiatan belajar mengajar hari ini..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                </div>

                {/* Siswa terlambat */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block flex items-center gap-1">
                    <Clock size={12} /> Siswa Terlambat
                  </label>
                  {siswaTerlambat.map((s, i) => (
                    <div key={i} className="flex gap-2 items-center mb-1 text-sm bg-orange-50 rounded-lg px-3 py-1.5">
                      <span className="flex-1">{s.nama} — {s.kelas} ({s.jam})</span>
                      <button onClick={() => setSiswaTerlambat(st => st.filter((_, j) => j !== i))}><X size={14} className="text-gray-400" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input placeholder="Nama siswa" value={newSiswa.nama} onChange={e => setNewSiswa(s => ({ ...s, nama: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                    <input placeholder="Kelas" value={newSiswa.kelas} onChange={e => setNewSiswa(s => ({ ...s, kelas: e.target.value }))}
                      className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                    <input placeholder="Jam" value={newSiswa.jam} onChange={e => setNewSiswa(s => ({ ...s, jam: e.target.value }))}
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                    <button onClick={() => { if (newSiswa.nama) { setSiswaTerlambat(st => [...st, newSiswa]); setNewSiswa({ nama: '', kelas: '', jam: '' }); } }}
                      className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200">+ Tambah</button>
                  </div>
                </div>

                {/* Guru tidak masuk */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block flex items-center gap-1">
                    <UserX size={12} /> Guru Tidak Masuk
                  </label>
                  {guruTidakMasuk.map((g, i) => (
                    <div key={i} className="flex gap-2 items-center mb-1 text-sm bg-red-50 rounded-lg px-3 py-1.5">
                      <span className="flex-1">{g.nama} — {g.mata_pelajaran} ({g.keterangan})</span>
                      <button onClick={() => setGuruTidakMasuk(gm => gm.filter((_, j) => j !== i))}><X size={14} className="text-gray-400" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input placeholder="Nama guru" value={newGuru.nama} onChange={e => setNewGuru(g => ({ ...g, nama: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                    <input placeholder="Mapel" value={newGuru.mata_pelajaran} onChange={e => setNewGuru(g => ({ ...g, mata_pelajaran: e.target.value }))}
                      className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                    <input placeholder="Ket." value={newGuru.keterangan} onChange={e => setNewGuru(g => ({ ...g, keterangan: e.target.value }))}
                      className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                    <button onClick={() => { if (newGuru.nama) { setGuruTidakMasuk(gm => [...gm, newGuru]); setNewGuru({ nama: '', mata_pelajaran: '', keterangan: '' }); } }}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">+ Tambah</button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Catatan Tambahan</label>
                  <textarea value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} rows={2}
                    placeholder="Hal-hal lain yang perlu dicatat..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
                <button onClick={submit} disabled={createMut.isPending || !form.tanggal}
                  className="flex-1 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#166f6c] disabled:opacity-50">
                  {createMut.isPending ? 'Menyimpan...' : 'Simpan Laporan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
        {!isLoading && list.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <ClipboardList size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Belum ada laporan piket.</p>
          </div>
        )}
        <div className="space-y-3">
          {list.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(a)}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[#1A2332] text-sm">
                    {a.tanggal ? new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Oleh: {a.guru?.user?.nama || '—'}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); if (confirm('Hapus laporan ini?')) deleteMut.mutate(a.id); }}
                  className="text-gray-300 hover:text-red-400"><Trash2 size={16} /></button>
              </div>
              {a.keadaan_kbm && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{a.keadaan_kbm}</p>}
              <div className="flex gap-4 mt-3 text-xs text-gray-400">
                {(a.siswa_terlambat?.length > 0) && <span className="text-orange-500">⏰ {a.siswa_terlambat.length} siswa terlambat</span>}
                {(a.guru_tidak_masuk?.length > 0) && <span className="text-red-500">✗ {a.guru_tidak_masuk.length} guru tidak masuk</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
