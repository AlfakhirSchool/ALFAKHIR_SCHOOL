'use client';

import { useState } from 'react';
import { X, Download, Users, ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-50 text-blue-700',
  reviewed: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
};

const KEHADIRAN_OPTS = ['hadir', 'sakit', 'izin', 'alfa'] as const;
const KEHADIRAN_COLOR: Record<string, string> = {
  hadir: 'bg-green-100 text-green-700 border-green-300',
  sakit: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  izin:  'bg-blue-100 text-blue-700 border-blue-300',
  alfa:  'bg-red-100 text-red-700 border-red-300',
};

const emptyForm = {
  kelas_id: '', mata_pelajaran_id: '', tanggal: new Date().toISOString().split('T')[0],
  topik_pelajaran: '', deskripsi_pembelajaran: '', hasil_pembelajaran: '', rencana_tindak_lanjut: '',
};

export default function JurnalPage() {
  const qc = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const { data: profileData } = useQuery({
    queryKey: ['guru-profile'],
    queryFn: () => api.get('/auth/me').then(r => {
      const d = r.data.data;
      if (d?.guru && !((user as any)?.school_levels)?.length) {
        updateUser({ school_levels: d.guru.school_levels || [], spesialisasi: d.guru.spesialisasi || '' });
      }
      return d;
    }),
    staleTime: 5 * 60 * 1000,
  });

  const schoolLevels: string[] = (user as any)?.school_levels?.length
    ? (user as any).school_levels
    : profileData?.guru?.school_levels || [];

  const [view, setView] = useState<'list' | 'form' | 'siswa'>('list');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterTgl, setFilterTgl] = useState('');
  const [activeJurnal, setActiveJurnal] = useState<any>(null);

  // State tabel siswa
  const [siswaRows, setSiswaRows] = useState<Record<string, { kehadiran: string; catatan: string }>>({});
  const [siswaMsg, setSiswaMsg] = useState('');

  const { data: jurnalList, isLoading } = useQuery({
    queryKey: ['jurnal-guru'],
    queryFn: () => api.get('/jurnal-guru').then(r => r.data.data || []),
  });

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data: mapelListRaw } = useQuery({
    queryKey: ['mapel-list', schoolLevels],
    queryFn: async () => {
      if (schoolLevels.length === 0) return api.get('/mata-pelajaran').then(r => r.data.data || []);
      const results = await Promise.all(schoolLevels.map(lvl => api.get('/mata-pelajaran', { params: { jenjang: lvl } }).then(r => r.data.data || [])));
      return results.flat();
    },
  });
  const mapelList = mapelListRaw || [];

  // Siswa untuk jurnal yang aktif
  const { data: siswaKelas } = useQuery({
    queryKey: ['siswa-kelas', activeJurnal?.kelas_id],
    queryFn: () => api.get(`/kelas/${activeJurnal.kelas_id}/siswa`).then(r => r.data.data || []),
    enabled: !!activeJurnal?.kelas_id && view === 'siswa',
  });

  // Detail siswa yang sudah diisi
  const { data: siswaDetail } = useQuery({
    queryKey: ['jurnal-siswa-detail', activeJurnal?.id],
    queryFn: () => api.get(`/jurnal-guru/${activeJurnal.id}/siswa`).then(r => r.data.data || []),
    enabled: !!activeJurnal?.id && view === 'siswa',
    onSuccess: (data: any[]) => {
      const map: Record<string, { kehadiran: string; catatan: string }> = {};
      data.forEach(d => { map[d.siswa_id] = { kehadiran: d.kehadiran, catatan: d.catatan || '' }; });
      setSiswaRows(map);
    },
  } as any);

  const openDetailSiswa = (jurnal: any) => {
    setActiveJurnal(jurnal);
    setSiswaRows({});
    setSiswaMsg('');
    setView('siswa');
  };

  const saveSiswa = useMutation({
    mutationFn: () => {
      const items = (siswaKelas || []).map((s: any) => ({
        siswa_id: s.id,
        kehadiran: siswaRows[s.id]?.kehadiran || 'hadir',
        catatan: siswaRows[s.id]?.catatan || '',
      }));
      return api.put(`/jurnal-guru/${activeJurnal.id}/siswa`, { items });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jurnal-siswa-detail', activeJurnal?.id] });
      qc.invalidateQueries({ queryKey: ['jurnal-guru'] });
      setSiswaMsg('Tersimpan!');
      setTimeout(() => setSiswaMsg(''), 2000);
    },
  });

  const filteredJurnal = filterTgl
    ? (jurnalList || []).filter((j: any) => j.tanggal?.split('T')[0] === filterTgl)
    : (jurnalList || []);

  const saveJurnal = useMutation({
    mutationFn: () => editId
      ? api.put(`/jurnal-guru/${editId}`, form)
      : api.post('/jurnal-guru', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jurnal-guru'] });
      setView('list');
      setForm(emptyForm);
      setEditId(null);
    },
  });

  const [submitError, setSubmitError] = useState('');
  const [detailJurnal, setDetailJurnal] = useState<any>(null);

  const submitJurnal = useMutation({
    mutationFn: (id: string) => api.post(`/jurnal-guru/${id}/submit`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jurnal-guru'] }); setSubmitError(''); },
    onError: (e: any) => setSubmitError(e?.response?.data?.message || 'Gagal submit jurnal'),
  });

  const deleteJurnal = useMutation({
    mutationFn: (id: string) => api.delete(`/jurnal-guru/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jurnal-guru'] }),
  });

  const openEdit = (j: any) => {
    setForm({
      kelas_id: j.kelas_id, mata_pelajaran_id: j.mata_pelajaran_id,
      tanggal: j.tanggal?.split('T')[0] || '',
      topik_pelajaran: j.topik_pelajaran || '',
      deskripsi_pembelajaran: j.deskripsi_pembelajaran || '',
      hasil_pembelajaran: j.hasil_pembelajaran || '',
      rencana_tindak_lanjut: j.rencana_tindak_lanjut || '',
    });
    setEditId(j.id);
    setView('form');
  };

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  const setRow = (siswaId: string, field: 'kehadiran' | 'catatan', val: string) => {
    setSiswaRows(prev => ({
      ...prev,
      [siswaId]: { kehadiran: prev[siswaId]?.kehadiran || 'hadir', catatan: prev[siswaId]?.catatan || '', [field]: val },
    }));
  };

  // Hitung ringkasan kehadiran dari siswaRows
  const totalSiswa = (siswaKelas || []).length;
  const hadir = (siswaKelas || []).filter((s: any) => (siswaRows[s.id]?.kehadiran || 'hadir') === 'hadir').length;
  const sakit = (siswaKelas || []).filter((s: any) => siswaRows[s.id]?.kehadiran === 'sakit').length;
  const izin  = (siswaKelas || []).filter((s: any) => siswaRows[s.id]?.kehadiran === 'izin').length;
  const alfa  = (siswaKelas || []).filter((s: any) => siswaRows[s.id]?.kehadiran === 'alfa').length;

  return (
    <div>
      <Header title="Jurnal Guru" />
      <div className="p-6">

        {/* VIEW: LIST */}
        {view === 'list' && (
          <>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">{filteredJurnal.length} jurnal</p>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterTgl} onChange={e => setFilterTgl(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
                  {filterTgl && <button onClick={() => setFilterTgl('')} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X size={12} />Reset</button>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const XLSX = await import('xlsx');
                    const rows = (jurnalList || []).map((j: any) => ({
                      'Tanggal': j.tanggal ? new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
                      'Kelas': j.kelas?.nama || '',
                      'Mata Pelajaran': j.mata_pelajaran?.nama || '',
                      'Topik Pelajaran': j.topik_pelajaran || '',
                      'Tugas': j.deskripsi_pembelajaran || '',
                      'Catatan Guru': j.hasil_pembelajaran || '',
                      'Rencana Tindak Lanjut': j.rencana_tindak_lanjut || '',
                      'Status': j.status || '',
                    }));
                    const ws = XLSX.utils.json_to_sheet(rows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
                    XLSX.writeFile(wb, `Jurnal_${user?.nama?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
                  }}
                  className="px-4 py-2 border border-[#1B8B87] text-[#1B8B87] rounded-lg text-sm font-medium hover:bg-teal-50 flex items-center gap-1.5"
                >
                  <Download size={14} /> Download XLSX
                </button>
                <button
                  onClick={() => { setForm(emptyForm); setEditId(null); setView('form'); }}
                  className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#156f6c]"
                >
                  + Buat Jurnal Baru
                </button>
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 mb-3">{submitError}</div>
            )}

            <div className="space-y-3">
              {isLoading && <div className="text-center py-12 text-gray-400">Memuat...</div>}
              {!isLoading && filteredJurnal.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                  <p className="text-gray-400">{filterTgl ? 'Tidak ada jurnal pada tanggal ini.' : 'Belum ada jurnal. Klik tombol di atas untuk membuat.'}</p>
                </div>
              )}
              {filteredJurnal.map((j: any) => (
                <div key={j.id} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 cursor-pointer" onClick={() => setDetailJurnal(j)}>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-[#1A2332]">{j.topik_pelajaran}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[j.status]}`}>{j.status}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {j.kelas?.nama} · {j.mata_pelajaran?.nama || '—'} · {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {(j.jumlah_siswa_hadir > 0 || j.jumlah_siswa_sakit > 0 || j.jumlah_siswa_izin > 0 || j.jumlah_siswa_alfa > 0) && (
                        <div className="flex gap-3 mt-2 text-xs">
                          <span className="text-green-600">H: {j.jumlah_siswa_hadir}</span>
                          <span className="text-yellow-600">S: {j.jumlah_siswa_sakit}</span>
                          <span className="text-blue-600">I: {j.jumlah_siswa_izin}</span>
                          <span className="text-red-600">A: {j.jumlah_siswa_alfa}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openDetailSiswa(j)}
                        className="text-xs px-3 py-1.5 bg-teal-50 text-[#1B8B87] border border-[#1B8B87]/30 rounded-lg hover:bg-teal-100 flex items-center gap-1"
                      >
                        <Users size={12} /> Isi Siswa
                      </button>
                      {j.status !== 'approved' && (
                        <>
                          <button onClick={() => openEdit(j)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                          {j.status === 'draft' && (
                            <button onClick={() => submitJurnal.mutate(j.id)} disabled={submitJurnal.isPending}
                              className="text-xs px-3 py-1.5 bg-[#1B8B87] text-white rounded-lg hover:bg-[#156f6c] disabled:opacity-50">Submit</button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => { if (confirm('Hapus jurnal ini?')) deleteJurnal.mutate(j.id); }}
                        disabled={deleteJurnal.isPending}
                        className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40"
                      >Hapus</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VIEW: FORM JURNAL */}
        {view === 'form' && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-[#1A2332]">{editId ? 'Edit Jurnal' : 'Buat Jurnal Baru'}</h2>
              <button onClick={() => { setView('list'); setForm(emptyForm); setEditId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={14} className="inline mr-1" />Batal
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
                  <select value={form.kelas_id} onChange={(e) => f('kelas_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Kelas --</option>
                    {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran</label>
                  <select value={form.mata_pelajaran_id} onChange={(e) => f('mata_pelajaran_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                    <option value="">-- Mapel --</option>
                    {mapelList.map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                <input type="date" value={form.tanggal} onChange={(e) => f('tanggal', e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Topik *</label>
                <input value={form.topik_pelajaran} onChange={(e) => f('topik_pelajaran', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]"
                  placeholder="Topik pelajaran hari ini..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tugas</label>
                <textarea value={form.deskripsi_pembelajaran} onChange={(e) => f('deskripsi_pembelajaran', e.target.value)}
                  rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] resize-none"
                  placeholder="Tugas yang diberikan kepada siswa..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catatan Guru</label>
                <textarea value={form.hasil_pembelajaran} onChange={(e) => f('hasil_pembelajaran', e.target.value)}
                  rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] resize-none"
                  placeholder="Catatan atau kondisi kelas hari ini..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rencana Tindak Lanjut</label>
                <textarea value={form.rencana_tindak_lanjut} onChange={(e) => f('rencana_tindak_lanjut', e.target.value)}
                  rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] resize-none"
                  placeholder="Rencana pertemuan berikutnya..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => saveJurnal.mutate()}
                  disabled={!form.topik_pelajaran || !form.kelas_id || !form.mata_pelajaran_id || saveJurnal.isPending}
                  className="flex-1 py-3 bg-[#1B8B87] text-white rounded-lg font-semibold hover:bg-[#156f6c] disabled:opacity-50"
                >
                  {saveJurnal.isPending ? 'Menyimpan...' : 'Simpan sebagai Draft'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: TABEL SISWA PER JURNAL */}
        {view === 'siswa' && activeJurnal && (
          <div>
            <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
              <ChevronLeft size={16} /> Kembali ke Daftar Jurnal
            </button>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Header jurnal */}
              <div className="px-6 py-4 bg-[#1B8B87]/5 border-b border-[#1B8B87]/10">
                <h2 className="font-semibold text-[#1A2332]">{activeJurnal.topik_pelajaran}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {activeJurnal.kelas?.nama} · {activeJurnal.mata_pelajaran?.nama} · {new Date(activeJurnal.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Ringkasan kehadiran */}
              <div className="flex gap-6 px-6 py-3 bg-gray-50 border-b border-gray-100 text-sm">
                <span>Total: <strong>{totalSiswa}</strong></span>
                <span className="text-green-700">Hadir: <strong>{hadir}</strong></span>
                <span className="text-yellow-700">Sakit: <strong>{sakit}</strong></span>
                <span className="text-blue-700">Izin: <strong>{izin}</strong></span>
                <span className="text-red-700">Alfa: <strong>{alfa}</strong></span>
              </div>

              {/* Tabel siswa */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left w-8">No</th>
                      <th className="px-4 py-3 text-left">Nama Siswa</th>
                      <th className="px-4 py-3 text-center w-56">Kehadiran</th>
                      <th className="px-4 py-3 text-left">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {!siswaKelas && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Memuat daftar siswa...</td></tr>
                    )}
                    {siswaKelas?.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Belum ada siswa di kelas ini.</td></tr>
                    )}
                    {(siswaKelas || []).map((s: any, idx: number) => {
                      const row = siswaRows[s.id] || { kehadiran: 'hadir', catatan: '' };
                      return (
                        <tr key={s.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{s.user?.nama}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-center">
                              {KEHADIRAN_OPTS.map(k => (
                                <button key={k}
                                  onClick={() => setRow(s.id, 'kehadiran', k)}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize transition-all ${row.kehadiran === k ? KEHADIRAN_COLOR[k] : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                                  {k.charAt(0).toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={row.catatan}
                              onChange={e => setRow(s.id, 'catatan', e.target.value)}
                              placeholder="Catatan untuk siswa ini..."
                              className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#1B8B87]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer save */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-4">
                <button
                  onClick={() => saveSiswa.mutate()}
                  disabled={saveSiswa.isPending || !siswaKelas?.length}
                  className="px-6 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-semibold hover:bg-[#156f6c] disabled:opacity-50"
                >
                  {saveSiswa.isPending ? 'Menyimpan...' : 'Simpan Kehadiran & Catatan'}
                </button>
                {siswaMsg && <span className="text-sm text-green-600 font-medium">{siswaMsg}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Jurnal */}
      {detailJurnal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetailJurnal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-semibold text-[#1A2332]">{detailJurnal.topik_pelajaran}</h2>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[detailJurnal.status]}`}>{detailJurnal.status}</span>
              </div>
              <button onClick={() => setDetailJurnal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div><span className="font-medium block">Kelas</span>{detailJurnal.kelas?.nama || '—'}</div>
                <div><span className="font-medium block">Mata Pelajaran</span>{detailJurnal.mata_pelajaran?.nama || '—'}</div>
                <div><span className="font-medium block">Tanggal</span>{new Date(detailJurnal.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              {detailJurnal.deskripsi_pembelajaran && (
                <div><p className="text-xs font-medium text-gray-600 mb-1">Tugas</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailJurnal.deskripsi_pembelajaran}</p></div>
              )}
              {detailJurnal.hasil_pembelajaran && (
                <div><p className="text-xs font-medium text-gray-600 mb-1">Catatan Guru</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailJurnal.hasil_pembelajaran}</p></div>
              )}
              {detailJurnal.rencana_tindak_lanjut && (
                <div><p className="text-xs font-medium text-gray-600 mb-1">Rencana Tindak Lanjut</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailJurnal.rencana_tindak_lanjut}</p></div>
              )}
              <div className="flex gap-2 pt-2 flex-wrap">
                <button onClick={() => { openDetailSiswa(detailJurnal); setDetailJurnal(null); }}
                  className="px-4 py-2 bg-teal-50 text-[#1B8B87] border border-[#1B8B87]/30 rounded-lg text-sm hover:bg-teal-100 flex items-center gap-1">
                  <Users size={14} /> Isi Detail Siswa
                </button>
                {detailJurnal.status !== 'approved' && (
                  <>
                    <button onClick={() => { openEdit(detailJurnal); setDetailJurnal(null); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Edit</button>
                    {detailJurnal.status === 'draft' && (
                      <button onClick={() => { submitJurnal.mutate(detailJurnal.id); setDetailJurnal(null); }}
                        className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm hover:bg-[#156f6c]">Submit</button>
                    )}
                  </>
                )}
                <button onClick={() => { if (confirm('Hapus jurnal ini?')) { deleteJurnal.mutate(detailJurnal.id); setDetailJurnal(null); } }}
                  className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 ml-auto">Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
