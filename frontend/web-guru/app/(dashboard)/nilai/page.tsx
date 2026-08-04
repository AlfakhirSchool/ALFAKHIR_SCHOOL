'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

interface NilaiRow {
  siswa_id: string;
  nama: string;
  kuis: string;
  tugas: string;
  uts: string;
  uas: string;
  nilai_akhir?: number;
  grade?: string;
}

function calcNilai(kuis: number, tugas: number, uts: number, uas: number) {
  const na = (kuis * 0.1) + (tugas * 0.15) + (uts * 0.25) + (uas * 0.5);
  const grade = na >= 85 ? 'A' : na >= 75 ? 'B' : na >= 65 ? 'C' : na >= 55 ? 'D' : 'E';
  return { na: Math.round(na * 100) / 100, grade };
}

export default function NilaiPage() {
  const [filter, setFilter] = useState({ kelas_id: '', mata_pelajaran_id: '', semester: '1', tahun_ajaran: '2024/2025' });
  const [rows, setRows] = useState<NilaiRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data: mapelList } = useQuery({
    queryKey: ['mapel-list'],
    queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data || []),
  });

  const loadSiswa = async () => {
    const res = await api.get(`/kelas/${filter.kelas_id}/siswa`);
    const siswaList = res.data.data || [];
    const nilaiRes = await api.get('/nilai/laporan', {
      params: { kelas_id: filter.kelas_id, mata_pelajaran_id: filter.mata_pelajaran_id, semester: filter.semester, tahun_ajaran: filter.tahun_ajaran }
    }).catch(() => ({ data: { data: [] } }));
    const existingNilai: any[] = nilaiRes.data.data || [];

    const newRows: NilaiRow[] = siswaList.map((s: any) => {
      const existing = existingNilai.find((n: any) => n.siswa_id === s.id);
      return {
        siswa_id: s.id,
        nama: s.user?.nama || '',
        kuis: existing?.kuis?.toString() || '',
        tugas: existing?.tugas?.toString() || '',
        uts: existing?.uts?.toString() || '',
        uas: existing?.uas?.toString() || '',
      };
    });
    setRows(newRows);
    setLoaded(true);
  };

  const updateRow = (idx: number, field: keyof NilaiRow, val: string) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const saveAll = useMutation({
    mutationFn: async () => {
      const payloads = rows
        .filter(r => r.kuis || r.tugas || r.uts || r.uas)
        .map(r => ({
          siswa_id: r.siswa_id,
          mata_pelajaran_id: filter.mata_pelajaran_id,
          semester: parseInt(filter.semester),
          tahun_ajaran: filter.tahun_ajaran,
          kuis: parseFloat(r.kuis) || 0,
          tugas: parseFloat(r.tugas) || 0,
          uts: parseFloat(r.uts) || 0,
          uas: parseFloat(r.uas) || 0,
        }));
      for (const p of payloads) {
        await api.post('/nilai', p);
      }
    },
    onSuccess: () => setSaveStatus('Nilai berhasil disimpan!'),
    onError: () => setSaveStatus('Gagal menyimpan nilai'),
  });

  return (
    <div>
      <Header title="Input Nilai" />
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
              <select
                value={filter.kelas_id}
                onChange={(e) => { setFilter({ ...filter, kelas_id: e.target.value }); setLoaded(false); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
              >
                <option value="">-- Kelas --</option>
                {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran</label>
              <select
                value={filter.mata_pelajaran_id}
                onChange={(e) => { setFilter({ ...filter, mata_pelajaran_id: e.target.value }); setLoaded(false); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
              >
                <option value="">-- Mapel --</option>
                {(mapelList || []).map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
              <select
                value={filter.semester}
                onChange={(e) => setFilter({ ...filter, semester: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tahun Ajaran</label>
              <input
                value={filter.tahun_ajaran}
                onChange={(e) => setFilter({ ...filter, tahun_ajaran: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                placeholder="2024/2025"
              />
            </div>
          </div>
          <button
            onClick={loadSiswa}
            disabled={!filter.kelas_id || !filter.mata_pelajaran_id}
            className="px-5 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#156f6c] disabled:opacity-50"
          >
            Muat Data Siswa
          </button>
        </div>

        {loaded && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mt-1">
                  Formula: Nilai Akhir = Kuis×10% + Tugas×15% + UTS×25% + UAS×50%
                </p>
              </div>
              <div className="flex items-center gap-3">
                {saveStatus && (
                  <span className={`text-sm ${saveStatus.includes('berhasil') ? 'text-green-600' : 'text-red-500'}`}>
                    {saveStatus}
                  </span>
                )}
                <button
                  onClick={() => saveAll.mutate()}
                  disabled={saveAll.isPending}
                  className="px-5 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#156f6c] disabled:opacity-50"
                >
                  {saveAll.isPending ? 'Menyimpan...' : 'Simpan Semua Nilai'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">No</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Nama Siswa</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Kuis (10%)</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Tugas (15%)</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">UTS (25%)</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">UAS (50%)</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Nilai Akhir</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row, idx) => {
                    const k = parseFloat(row.kuis) || 0;
                    const t = parseFloat(row.tugas) || 0;
                    const u = parseFloat(row.uts) || 0;
                    const a = parseFloat(row.uas) || 0;
                    const { na, grade } = calcNilai(k, t, u, a);
                    const hasData = row.kuis || row.tugas || row.uts || row.uas;

                    return (
                      <tr key={row.siswa_id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.nama}</td>
                        {(['kuis', 'tugas', 'uts', 'uas'] as const).map(field => (
                          <td key={field} className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row[field]}
                              onChange={(e) => updateRow(idx, field, e.target.value)}
                              className="w-16 text-center px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B8B87] text-sm"
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          {hasData ? (
                            <span className="font-bold text-[#1B8B87]">{na}</span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasData ? (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              grade === 'A' ? 'bg-green-50 text-green-700' :
                              grade === 'B' ? 'bg-blue-50 text-blue-700' :
                              grade === 'C' ? 'bg-yellow-50 text-yellow-700' :
                              grade === 'D' ? 'bg-orange-50 text-orange-700' :
                              'bg-red-50 text-red-700'
                            }`}>{grade}</span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
