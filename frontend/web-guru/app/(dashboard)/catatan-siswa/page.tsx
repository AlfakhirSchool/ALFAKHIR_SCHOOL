'use client';

import { useState } from 'react';
import { X, ChevronLeft, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const KEHADIRAN_OPTS = ['hadir', 'sakit', 'izin', 'alfa'] as const;

const RATING_OPTS = ['kurang', 'cukup', 'baik', 'sangat_baik'] as const;
const RATING_LABEL: Record<string, string> = { kurang: 'Kurang', cukup: 'Cukup', baik: 'Baik', sangat_baik: 'Sangat Baik' };
const RATING_COLOR: Record<string, string> = {
  kurang:     'bg-red-100 text-red-700 border-red-300',
  cukup:      'bg-yellow-100 text-yellow-700 border-yellow-300',
  baik:       'bg-blue-100 text-blue-700 border-blue-300',
  sangat_baik:'bg-green-100 text-green-700 border-green-300',
};

const K_ACTIVE: Record<string, string> = {
  hadir: 'bg-green-500 text-white border-green-500',
  sakit: 'bg-yellow-400 text-white border-yellow-400',
  izin:  'bg-blue-500 text-white border-blue-500',
  alfa:  'bg-red-500 text-white border-red-500',
};
const K_LABEL: Record<string, string> = { hadir: 'H', sakit: 'S', izin: 'I', alfa: 'A' };
const K_PASSIVE = 'bg-white text-gray-300 border-gray-200 hover:border-gray-300';

const emptyForm = {
  kelas_id: '', mata_pelajaran_id: '',
  tanggal: new Date().toISOString().split('T')[0],
  topik_pelajaran: '', hasil_pembelajaran: '',
};

export default function CatatanSiswaPage() {
  const qc = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const { data: profileData } = useQuery({
    queryKey: ['guru-profile-cs'],
    queryFn: () => api.get('/auth/me').then(r => {
      const d = r.data.data;
      if (d?.guru && !((user as any)?.school_levels)?.length) {
        updateUser({ school_levels: d.guru.school_levels || [] });
      }
      return d;
    }),
    staleTime: 5 * 60 * 1000,
  });

  const guruId = profileData?.guru?.id;

  const [view, setView] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterTgl, setFilterTgl] = useState('');
  const [rows, setRows] = useState<Record<string, { kehadiran: string; partisipasi: string; pemahaman_materi: string; sikap_perilaku: string; catatan: string }>>({});
  const [savedMsg, setSavedMsg] = useState('');

  const { data: jurnalList = [], isLoading } = useQuery({
    queryKey: ['catatan-siswa-list'],
    queryFn: () => api.get('/jurnal-guru').then(r => r.data.data || []),
  });

  const { data: jadwalGuru = [] } = useQuery({
    queryKey: ['jadwal-guru-cs', guruId],
    queryFn: () => api.get('/jadwal', { params: { guru_id: guruId } }).then(r => r.data.data || []),
    enabled: !!guruId,
  });

  const kelasList = [...new Map((jadwalGuru as any[]).filter(j => j.kelas).map(j => [j.kelas.id, j.kelas])).values()];
  const mapelListRaw = form.kelas_id
    ? [...new Map((jadwalGuru as any[]).filter(j => j.kelas_id === form.kelas_id && j.mata_pelajaran).map(j => [j.mata_pelajaran.id, j.mata_pelajaran])).values()]
    : [...new Map((jadwalGuru as any[]).filter(j => j.mata_pelajaran).map(j => [j.mata_pelajaran.id, j.mata_pelajaran])).values()];

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-cs', form.kelas_id],
    queryFn: () => api.get(`/kelas/${form.kelas_id}/siswa`).then(r => r.data.data || []),
    enabled: !!form.kelas_id && view === 'form',
  });

  // Saat edit, load detail siswa yang sudah ada
  useQuery({
    queryKey: ['catatan-siswa-detail-edit', editId],
    queryFn: () => api.get(`/jurnal-guru/${editId}/siswa`).then(r => {
      const map: Record<string, any> = {};
      (r.data.data || []).forEach((d: any) => {
        map[d.siswa_id] = {
          kehadiran: d.kehadiran || 'hadir',
          partisipasi: d.partisipasi || 'baik',
          pemahaman_materi: d.pemahaman_materi || 'baik',
          sikap_perilaku: d.sikap_perilaku || 'baik',
          catatan: d.catatan || '',
        };
      });
      setRows(map);
      return r.data.data;
    }),
    enabled: !!editId && view === 'form',
  });

  const defaultRow = () => ({ kehadiran: 'hadir', partisipasi: 'baik', pemahaman_materi: 'baik', sikap_perilaku: 'baik', catatan: '' });

  const setRow = (siswaId: string, field: string, val: string) => {
    setRows(prev => ({ ...prev, [siswaId]: { ...defaultRow(), ...prev[siswaId], [field]: val } }));
  };

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  const simpan = useMutation({
    mutationFn: async () => {
      let jurnalId = editId;
      if (!jurnalId) {
        const res = await api.post('/jurnal-guru', {
          ...form,
          topik_pelajaran: form.topik_pelajaran || '-',
          status: 'draft',
        });
        jurnalId = res.data.data.id;
      } else {
        await api.put(`/jurnal-guru/${jurnalId}`, {
          topik_pelajaran: form.topik_pelajaran || '-',
          hasil_pembelajaran: form.hasil_pembelajaran,
        });
      }
      if ((siswaList as any[]).length > 0) {
        const items = (siswaList as any[]).map((s: any) => ({
          siswa_id: s.id,
          kehadiran: rows[s.id]?.kehadiran || 'hadir',
          partisipasi: rows[s.id]?.partisipasi || 'baik',
          pemahaman_materi: rows[s.id]?.pemahaman_materi || 'baik',
          sikap_perilaku: rows[s.id]?.sikap_perilaku || 'baik',
          catatan: rows[s.id]?.catatan || '',
        }));
        await api.put(`/jurnal-guru/${jurnalId}/siswa`, { items });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catatan-siswa-list'] });
      setSavedMsg('Tersimpan!');
      setTimeout(() => {
        setSavedMsg('');
        setView('list');
        setForm(emptyForm);
        setEditId(null);
        setRows({});
      }, 1000);
    },
  });

  const hapus = useMutation({
    mutationFn: (id: string) => api.delete(`/jurnal-guru/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catatan-siswa-list'] }),
  });

  const openEdit = (j: any) => {
    setForm({
      kelas_id: j.kelas_id, mata_pelajaran_id: j.mata_pelajaran_id,
      tanggal: j.tanggal?.split('T')[0] || '',
      topik_pelajaran: j.topik_pelajaran === '-' ? '' : (j.topik_pelajaran || ''),
      hasil_pembelajaran: j.hasil_pembelajaran || '',
    });
    setRows({});
    setEditId(j.id);
    setView('form');
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setRows({});
    setView('form');
  };

  const filtered = filterTgl
    ? (jurnalList as any[]).filter((j: any) => j.tanggal?.split('T')[0] === filterTgl)
    : (jurnalList as any[]);

  const kelasSelected = (kelasList as any[]).find((k: any) => k.id === form.kelas_id);
  const mapelSelected = (mapelListRaw as any[]).find((m: any) => m.id === form.mata_pelajaran_id);

  const hadir = (siswaList as any[]).filter(s => (rows[(s as any).id]?.kehadiran || 'hadir') === 'hadir').length;
  const sakit = (siswaList as any[]).filter(s => rows[(s as any).id]?.kehadiran === 'sakit').length;
  const izin  = (siswaList as any[]).filter(s => rows[(s as any).id]?.kehadiran === 'izin').length;
  const alfa  = (siswaList as any[]).filter(s => rows[(s as any).id]?.kehadiran === 'alfa').length;

  return (
    <div>
      <Header title="Catatan Siswa" />
      <div className="p-6">

        {/* ===== LIST ===== */}
        {view === 'list' && (
          <>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">{filtered.length} catatan</p>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterTgl} onChange={e => setFilterTgl(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                  {filterTgl && (
                    <button onClick={() => setFilterTgl('')} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                      <X size={12} /> Reset
                    </button>
                  )}
                </div>
              </div>
              <button onClick={openNew}
                className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#156f6c]">
                + Buat Catatan Baru
              </button>
            </div>

            <div className="space-y-3">
              {isLoading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
              {!isLoading && filtered.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                  <p className="text-gray-400 text-sm">{filterTgl ? 'Tidak ada catatan pada tanggal ini.' : 'Belum ada catatan. Klik tombol di atas untuk membuat.'}</p>
                </div>
              )}
              {filtered.map((j: any) => (
                <div key={j.id} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1A2332]">{j.topik_pelajaran && j.topik_pelajaran !== '-' ? j.topik_pelajaran : 'Catatan Siswa'}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {j.kelas?.nama} · {j.mata_pelajaran?.nama || '—'} · {j.tanggal ? new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </p>
                      {(j.jumlah_siswa_hadir > 0 || j.jumlah_siswa_sakit > 0 || j.jumlah_siswa_izin > 0 || j.jumlah_siswa_alfa > 0) && (
                        <div className="flex gap-3 mt-2 text-xs font-medium">
                          <span className="text-green-600">H: {j.jumlah_siswa_hadir}</span>
                          <span className="text-yellow-600">S: {j.jumlah_siswa_sakit}</span>
                          <span className="text-blue-600">I: {j.jumlah_siswa_izin}</span>
                          <span className="text-red-600">A: {j.jumlah_siswa_alfa}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(j)}
                        className="text-xs px-3 py-1.5 bg-teal-50 text-[#1B8B87] border border-[#1B8B87]/30 rounded-lg hover:bg-teal-100">
                        Edit & Isi Siswa
                      </button>
                      <button onClick={() => { if (confirm('Hapus catatan ini?')) hapus.mutate(j.id); }}
                        className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== FORM ===== */}
        {view === 'form' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-[#1A2332]">{editId ? 'Edit Catatan Siswa' : 'Buat Catatan Baru'}</h2>
              <button onClick={() => { setView('list'); setForm(emptyForm); setEditId(null); setRows({}); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                <ChevronLeft size={14} /> Kembali
              </button>
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kelas *</label>
                <select value={form.kelas_id} onChange={e => { f('kelas_id', e.target.value); setRows({}); }}
                  disabled={!!editId}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] disabled:opacity-60">
                  <option value="">-- Kelas --</option>
                  {(kelasList as any[]).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran *</label>
                <select value={form.mata_pelajaran_id} onChange={e => f('mata_pelajaran_id', e.target.value)}
                  disabled={!!editId}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] disabled:opacity-60">
                  <option value="">-- Mapel --</option>
                  {(mapelListRaw as any[]).map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal *</label>
                <input type="date" value={form.tanggal} onChange={e => f('tanggal', e.target.value)}
                  disabled={!!editId}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] disabled:opacity-60" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Topik Pelajaran</label>
                <input value={form.topik_pelajaran} onChange={e => f('topik_pelajaran', e.target.value)}
                  placeholder="Topik pelajaran hari ini..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catatan Kelas</label>
                <input value={form.hasil_pembelajaran} onChange={e => f('hasil_pembelajaran', e.target.value)}
                  placeholder="Catatan kondisi kelas secara umum..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
              </div>
            </div>

            {/* Tabel siswa */}
            {form.kelas_id && form.mata_pelajaran_id && (
              (siswaList as any[]).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl mb-6">
                  Tidak ada siswa di kelas ini
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
                  <div className="px-5 py-3 bg-[#1B8B87]/5 border-b border-[#1B8B87]/10 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-[#1A2332]">
                      {kelasSelected?.nama} · {mapelSelected?.nama}
                    </h3>
                    <div className="flex gap-3 text-xs font-semibold">
                      <span className="text-green-700">H: {hadir}</span>
                      <span className="text-yellow-600">S: {sakit}</span>
                      <span className="text-blue-600">I: {izin}</span>
                      <span className="text-red-600">A: {alfa}</span>
                      <span className="text-gray-400 font-normal">/ {(siswaList as any[]).length}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                        <th className="px-3 py-2.5 text-left w-8">No</th>
                        <th className="px-3 py-2.5 text-left min-w-[160px]">Nama Siswa</th>
                        <th className="px-3 py-2.5 text-center w-36">Kehadiran</th>
                        <th className="px-3 py-2.5 text-center w-44">Partisipasi</th>
                        <th className="px-3 py-2.5 text-center w-44">Pemahaman Materi</th>
                        <th className="px-3 py-2.5 text-center w-44">Sikap/Perilaku</th>
                        <th className="px-3 py-2.5 text-left min-w-[180px]">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(siswaList as any[]).map((s: any, idx: number) => {
                        const row = { ...defaultRow(), ...rows[s.id] };
                        return (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-3 text-gray-400 text-xs tabular-nums">{idx + 1}</td>
                            <td className="px-3 py-3 font-medium text-gray-800 text-sm">{s.user?.nama || s.nama}</td>
                            {/* Kehadiran */}
                            <td className="px-3 py-3">
                              <div className="flex gap-1 justify-center">
                                {KEHADIRAN_OPTS.map(k => (
                                  <button key={k} onClick={() => setRow(s.id, 'kehadiran', k)}
                                    className={`w-7 h-7 rounded-md border text-xs font-bold transition-all ${row.kehadiran === k ? K_ACTIVE[k] : K_PASSIVE}`}>
                                    {K_LABEL[k]}
                                  </button>
                                ))}
                              </div>
                            </td>
                            {/* Partisipasi */}
                            <td className="px-3 py-3">
                              <select value={row.partisipasi} onChange={e => setRow(s.id, 'partisipasi', e.target.value)}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#1B8B87] ${RATING_COLOR[row.partisipasi] || ''}`}>
                                {RATING_OPTS.map(r => <option key={r} value={r}>{RATING_LABEL[r]}</option>)}
                              </select>
                            </td>
                            {/* Pemahaman Materi */}
                            <td className="px-3 py-3">
                              <select value={row.pemahaman_materi} onChange={e => setRow(s.id, 'pemahaman_materi', e.target.value)}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#1B8B87] ${RATING_COLOR[row.pemahaman_materi] || ''}`}>
                                {RATING_OPTS.map(r => <option key={r} value={r}>{RATING_LABEL[r]}</option>)}
                              </select>
                            </td>
                            {/* Sikap */}
                            <td className="px-3 py-3">
                              <select value={row.sikap_perilaku} onChange={e => setRow(s.id, 'sikap_perilaku', e.target.value)}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#1B8B87] ${RATING_COLOR[row.sikap_perilaku] || ''}`}>
                                {RATING_OPTS.map(r => <option key={r} value={r}>{RATING_LABEL[r]}</option>)}
                              </select>
                            </td>
                            {/* Catatan */}
                            <td className="px-3 py-3">
                              <textarea value={row.catatan} onChange={e => setRow(s.id, 'catatan', e.target.value)}
                                placeholder="Catatan tambahan..."
                                rows={2}
                                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#1B8B87] placeholder-gray-300 resize-y min-h-[40px]" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )
            )}

            <div className="flex items-center gap-3">
              <button onClick={() => simpan.mutate()}
                disabled={simpan.isPending || !form.kelas_id || !form.mata_pelajaran_id}
                className="flex items-center gap-2 px-5 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-semibold hover:bg-[#156f6c] disabled:opacity-50">
                <Save size={15} />
                {simpan.isPending ? 'Menyimpan...' : 'Simpan sebagai Draft'}
              </button>
              {savedMsg && <span className="text-sm text-green-600 font-medium">{savedMsg}</span>}
              {simpan.isError && <span className="text-sm text-red-500">Gagal menyimpan. Coba lagi.</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
