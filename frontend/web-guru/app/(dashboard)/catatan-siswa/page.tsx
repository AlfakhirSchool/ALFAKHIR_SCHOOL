'use client';

import { useState, useEffect } from 'react';
import { Download, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const KEHADIRAN_OPTS = ['hadir', 'sakit', 'izin', 'alfa'] as const;
const KEHADIRAN_COLOR: Record<string, string> = {
  hadir: 'bg-green-500 text-white border-green-500',
  sakit: 'bg-yellow-400 text-white border-yellow-400',
  izin:  'bg-blue-500 text-white border-blue-500',
  alfa:  'bg-red-500 text-white border-red-500',
};
const KEHADIRAN_PASSIVE = 'bg-white text-gray-300 border-gray-200 hover:border-gray-300';

export default function CatatanSiswaPage() {
  const qc = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const { data: profileData } = useQuery({
    queryKey: ['guru-profile-catatan'],
    queryFn: () => api.get('/auth/me').then(r => {
      const d = r.data.data;
      if (d?.guru && !((user as any)?.school_levels)?.length) {
        updateUser({ school_levels: d.guru.school_levels || [] });
      }
      return d;
    }),
    staleTime: 5 * 60 * 1000,
  });

  const schoolLevels: string[] = (user as any)?.school_levels?.length
    ? (user as any).school_levels
    : profileData?.guru?.school_levels || [];

  const today = new Date().toISOString().split('T')[0];
  const [tanggal, setTanggal] = useState(today);
  const [kelasId, setKelasId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [topik, setTopik] = useState('');
  const [catatanUmum, setCatatanUmum] = useState('');
  const [rows, setRows] = useState<Record<string, { kehadiran: string; catatan: string }>>({});
  const [savedMsg, setSavedMsg] = useState('');
  const [activeJurnalId, setActiveJurnalId] = useState<string | null>(null);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-guru'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data: mapelList = [] } = useQuery({
    queryKey: ['mapel-guru', schoolLevels],
    queryFn: async () => {
      if (schoolLevels.length === 0) return api.get('/mata-pelajaran').then(r => r.data.data || []);
      const res = await Promise.all(schoolLevels.map(l => api.get('/mata-pelajaran', { params: { jenjang: l } }).then(r => r.data.data || [])));
      return res.flat();
    },
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-catatan', kelasId],
    queryFn: () => api.get(`/kelas/${kelasId}/siswa`).then(r => r.data.data || []),
    enabled: !!kelasId,
  });

  // Cek jurnal yang sudah ada
  const { data: existingJurnal } = useQuery({
    queryKey: ['jurnal-cek-catatan', kelasId, mapelId, tanggal],
    queryFn: () => api.get('/jurnal-guru', { params: { kelas_id: kelasId, limit: 100 } }).then(r => {
      const list = r.data.data || [];
      return list.find((j: any) =>
        j.kelas_id === kelasId &&
        j.mata_pelajaran_id === mapelId &&
        j.tanggal?.split('T')[0] === tanggal
      ) || null;
    }),
    enabled: !!kelasId && !!mapelId && !!tanggal,
  });

  const { data: existingDetail } = useQuery({
    queryKey: ['catatan-siswa-detail', existingJurnal?.id],
    queryFn: () => api.get(`/jurnal-guru/${existingJurnal.id}/siswa`).then(r => r.data.data || []),
    enabled: !!existingJurnal?.id,
  });

  useEffect(() => {
    if (existingJurnal) {
      setActiveJurnalId(existingJurnal.id);
      setTopik(existingJurnal.topik_pelajaran === '-' ? '' : existingJurnal.topik_pelajaran || '');
      setCatatanUmum(existingJurnal.hasil_pembelajaran || '');
    } else {
      setActiveJurnalId(null);
    }
  }, [existingJurnal?.id]);

  useEffect(() => {
    if (existingDetail && existingDetail.length > 0) {
      const map: Record<string, { kehadiran: string; catatan: string }> = {};
      existingDetail.forEach((d: any) => { map[d.siswa_id] = { kehadiran: d.kehadiran, catatan: d.catatan || '' }; });
      setRows(map);
    } else if ((siswaList as any[]).length > 0) {
      const map: Record<string, { kehadiran: string; catatan: string }> = {};
      (siswaList as any[]).forEach((s: any) => { map[s.id] = { kehadiran: 'hadir', catatan: '' }; });
      setRows(map);
    }
  }, [existingDetail, (siswaList as any[]).length, kelasId, mapelId, tanggal]);

  const setRow = (siswaId: string, field: 'kehadiran' | 'catatan', val: string) => {
    setRows(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], [field]: val } }));
  };

  const hadir = (siswaList as any[]).filter(s => (rows[(s as any).id]?.kehadiran || 'hadir') === 'hadir').length;
  const sakit = (siswaList as any[]).filter(s => rows[(s as any).id]?.kehadiran === 'sakit').length;
  const izin  = (siswaList as any[]).filter(s => rows[(s as any).id]?.kehadiran === 'izin').length;
  const alfa  = (siswaList as any[]).filter(s => rows[(s as any).id]?.kehadiran === 'alfa').length;

  const simpan = useMutation({
    mutationFn: async () => {
      let jurnalId = activeJurnalId;
      if (!jurnalId) {
        const res = await api.post('/jurnal-guru', {
          kelas_id: kelasId,
          mata_pelajaran_id: mapelId,
          tanggal,
          topik_pelajaran: topik || '-',
          hasil_pembelajaran: catatanUmum,
        });
        jurnalId = res.data.data.id;
        setActiveJurnalId(jurnalId);
      } else {
        await api.put(`/jurnal-guru/${jurnalId}`, {
          topik_pelajaran: topik || '-',
          hasil_pembelajaran: catatanUmum,
        });
      }
      const items = (siswaList as any[]).map(s => ({
        siswa_id: (s as any).id,
        kehadiran: rows[(s as any).id]?.kehadiran || 'hadir',
        catatan: rows[(s as any).id]?.catatan || '',
      }));
      await api.put(`/jurnal-guru/${jurnalId}/siswa`, { items });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jurnal-cek-catatan'] });
      qc.invalidateQueries({ queryKey: ['catatan-siswa-detail'] });
      setSavedMsg('Catatan tersimpan!');
      setTimeout(() => setSavedMsg(''), 3000);
    },
  });

  const downloadExcel = async () => {
    const XLSX = await import('xlsx');
    const kelasNama = (kelasList as any[]).find(k => (k as any).id === kelasId)?.nama || '';
    const mapelNama = (mapelList as any[]).find(m => (m as any).id === mapelId)?.nama || '';
    const tglFormatted = new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const dataRows = (siswaList as any[]).map((s, i) => ({
      'No': i + 1,
      'Nama Siswa': (s as any).user?.nama || '',
      'Kehadiran': (rows[(s as any).id]?.kehadiran || 'hadir').toUpperCase(),
      'Catatan': rows[(s as any).id]?.catatan || '',
    }));

    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, [
      [`CATATAN SISWA — ${kelasNama}`],
      [`Mata Pelajaran: ${mapelNama} | Tanggal: ${tglFormatted}`],
      [`Topik: ${topik || '-'} | Hadir: ${hadir} | Sakit: ${sakit} | Izin: ${izin} | Alfa: ${alfa}`],
      [],
    ]);
    XLSX.utils.sheet_add_json(ws, dataRows, { origin: 4 });
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 45 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catatan Siswa');
    XLSX.writeFile(wb, `CatatanSiswa_${kelasNama}_${mapelNama}_${tanggal}.xlsx`);
  };

  const kelasSelected = (kelasList as any[]).find(k => (k as any).id === kelasId);
  const mapelSelected = (mapelList as any[]).find(m => (m as any).id === mapelId);
  const siap = !!kelasId && !!mapelId && !!tanggal && (siswaList as any[]).length > 0;

  return (
    <div>
      <Header title="Catatan Siswa" />
      <div className="p-6">

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
              <input type="date" value={tanggal} onChange={e => { setTanggal(e.target.value); setActiveJurnalId(null); setRows({}); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
              <select value={kelasId} onChange={e => { setKelasId(e.target.value); setRows({}); setActiveJurnalId(null); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                <option value="">-- Pilih Kelas --</option>
                {(kelasList as any[]).map(k => <option key={(k as any).id} value={(k as any).id}>{(k as any).nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran</label>
              <select value={mapelId} onChange={e => { setMapelId(e.target.value); setActiveJurnalId(null); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
                <option value="">-- Pilih Mapel --</option>
                {(mapelList as any[]).map(m => <option key={(m as any).id} value={(m as any).id}>{(m as any).nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Topik</label>
              <input value={topik} onChange={e => setTopik(e.target.value)} placeholder="Topik pelajaran hari ini..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
            </div>
          </div>
          {kelasId && mapelId && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan Umum</label>
              <input value={catatanUmum} onChange={e => setCatatanUmum(e.target.value)} placeholder="Catatan umum kelas hari ini..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]" />
            </div>
          )}
        </div>

        {/* Tabel */}
        {siap && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#1B8B87]/5 border-b border-[#1B8B87]/10 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-semibold text-[#1A2332]">{kelasSelected?.nama} · {mapelSelected?.nama}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {existingJurnal && <span className="ml-2 text-xs text-green-600 font-medium">● Sudah tersimpan</span>}
                </p>
              </div>
              <div className="flex gap-4 text-sm font-semibold">
                <span className="text-green-700">H: {hadir}</span>
                <span className="text-yellow-600">S: {sakit}</span>
                <span className="text-blue-600">I: {izin}</span>
                <span className="text-red-600">A: {alfa}</span>
                <span className="text-gray-500 font-normal">/ {(siswaList as any[]).length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-10">No</th>
                    <th className="px-4 py-3 text-left">Nama Siswa</th>
                    <th className="px-4 py-3 text-center w-52">Kehadiran</th>
                    <th className="px-4 py-3 text-left">Catatan Siswa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(siswaList as any[]).map((s, idx) => {
                    const row = rows[(s as any).id] || { kehadiran: 'hadir', catatan: '' };
                    return (
                      <tr key={(s as any).id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{(s as any).user?.nama}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-center">
                            {KEHADIRAN_OPTS.map(k => (
                              <button key={k} onClick={() => setRow((s as any).id, 'kehadiran', k)}
                                className={`w-8 h-8 rounded-lg border text-xs font-bold uppercase transition-all ${row.kehadiran === k ? KEHADIRAN_COLOR[k] : KEHADIRAN_PASSIVE}`}>
                                {k[0].toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input value={row.catatan} onChange={e => setRow((s as any).id, 'catatan', e.target.value)}
                            placeholder="Catatan untuk siswa ini..."
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#1B8B87] placeholder-gray-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
              <button onClick={() => simpan.mutate()} disabled={simpan.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-semibold hover:bg-[#156f6c] disabled:opacity-50">
                <Save size={15} />
                {simpan.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
              <button onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 border border-[#1B8B87] text-[#1B8B87] rounded-lg text-sm font-medium hover:bg-teal-50">
                <Download size={15} />
                Download Excel
              </button>
              {savedMsg && <span className="text-sm text-green-600 font-medium">{savedMsg}</span>}
              {simpan.isError && <span className="text-sm text-red-500">Gagal menyimpan. Coba lagi.</span>}
            </div>
          </div>
        )}

        {!kelasId && (
          <div className="bg-white rounded-xl p-16 text-center shadow-sm">
            <p className="text-gray-400 text-sm">Pilih kelas dan mata pelajaran untuk mulai mengisi catatan siswa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
