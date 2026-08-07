'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

interface SiswaRapor {
  siswa_id: string;
  nama: string;
  nis: string;
  nilai: { mata_pelajaran: string; nilai_akhir: number; grade: string }[];
  rata_rata: number;
  ranking: number;
  total_hadir: number;
  total_alpa: number;
  status: 'lulus' | 'remedial';
}

const gradeColor: Record<string, string> = {
  A: 'text-emerald-700 bg-emerald-50',
  B: 'text-blue-700 bg-blue-50',
  C: 'text-yellow-700 bg-yellow-50',
  D: 'text-orange-700 bg-orange-50',
  E: 'text-red-700 bg-red-50',
};

export default function RaporPage() {
  const [filter, setFilter] = useState({
    kelas_id: '',
    semester: '1',
    tahun_ajaran: '2024/2025',
  });
  const [searched, setSearched] = useState(false);

  const { data: kelasList } = useQuery({
    queryKey: ['my-kelas'],
    queryFn: () => api.get('/kelas').then((r) => r.data.data || []),
  });

  const {
    data: raporData,
    isFetching,
    refetch,
  } = useQuery<SiswaRapor[]>({
    queryKey: ['rapor-kelas', filter.kelas_id, filter.semester, filter.tahun_ajaran],
    queryFn: async () => {
      const [nilaiRes, siswaRes, absenRes] = await Promise.all([
        api.get('/nilai/laporan', {
          params: {
            kelas_id: filter.kelas_id,
            semester: filter.semester,
            tahun_ajaran: filter.tahun_ajaran,
          },
        }),
        api.get(`/kelas/${filter.kelas_id}/siswa`),
        api.get('/absensi/laporan', {
          params: { kelas_id: filter.kelas_id, tahun_ajaran: filter.tahun_ajaran },
        }),
      ]);

      const nilaiList: any[] = nilaiRes.data.data || [];
      const siswaList: any[] = siswaRes.data.data || [];
      const absenList: any[] = absenRes.data.data || [];

      const byMapel = nilaiList.reduce((acc: Record<string, any[]>, n: any) => {
        if (!acc[n.siswa_id]) acc[n.siswa_id] = [];
        acc[n.siswa_id].push(n);
        return acc;
      }, {});

      const rows: SiswaRapor[] = siswaList.map((s: any) => {
        const nilaiSiswa = byMapel[s.id] || [];
        const nilai = nilaiSiswa.map((n: any) => ({
          mata_pelajaran: n.mata_pelajaran?.nama || n.mata_pelajaran_id,
          nilai_akhir: Number(n.nilai_akhir || 0),
          grade: n.grade || 'E',
        }));
        const rata_rata =
          nilai.length > 0
            ? nilai.reduce((sum: number, n: any) => sum + n.nilai_akhir, 0) / nilai.length
            : 0;
        const absenSiswa = absenList.filter((a: any) => a.siswa_id === s.id);
        const total_hadir = absenSiswa.filter((a: any) => a.status === 'hadir').length;
        const total_alpa = absenSiswa.filter((a: any) => a.status === 'alpa').length;

        return {
          siswa_id: s.id,
          nama: s.user?.nama || s.nama || '',
          nis: s.nis || '',
          nilai,
          rata_rata: Math.round(rata_rata * 100) / 100,
          ranking: 0,
          total_hadir,
          total_alpa,
          status: rata_rata >= 75 ? 'lulus' : 'remedial',
        };
      });

      rows.sort((a, b) => b.rata_rata - a.rata_rata);
      rows.forEach((r, i) => (r.ranking = i + 1));
      return rows;
    },
    enabled: false,
  });

  const handleCari = () => {
    if (!filter.kelas_id) return;
    setSearched(true);
    refetch();
  };

  const kelasNama = kelasList?.find((k: any) => k.id === filter.kelas_id)?.nama || '';

  return (
    <div>
      <Header title="Rapor Kelas" />
      <div className="p-6 space-y-5">
        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-[#1A2332] mb-4">Filter Rapor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Kelas</label>
              <select
                value={filter.kelas_id}
                onChange={(e) => setFilter((f) => ({ ...f, kelas_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
              >
                <option value="">-- Pilih Kelas --</option>
                {kelasList?.map((k: any) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Semester</label>
              <select
                value={filter.semester}
                onChange={(e) => setFilter((f) => ({ ...f, semester: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tahun Ajaran</label>
              <select
                value={filter.tahun_ajaran}
                onChange={(e) => setFilter((f) => ({ ...f, tahun_ajaran: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
              >
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCari}
            disabled={!filter.kelas_id || isFetching}
            className="mt-4 px-5 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-[#157571] disabled:opacity-50 transition-colors"
          >
            {isFetching ? 'Memuat...' : '🔍 Tampilkan Rapor'}
          </button>
        </div>

        {/* Results */}
        {searched && raporData && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Siswa', value: raporData.length, color: 'bg-blue-50 text-blue-700' },
                {
                  label: 'Lulus',
                  value: raporData.filter((r) => r.status === 'lulus').length,
                  color: 'bg-emerald-50 text-emerald-700',
                },
                {
                  label: 'Remedial',
                  value: raporData.filter((r) => r.status === 'remedial').length,
                  color: 'bg-red-50 text-red-700',
                },
                {
                  label: 'Rata-rata Kelas',
                  value:
                    raporData.length > 0
                      ? (
                          raporData.reduce((s, r) => s + r.rata_rata, 0) / raporData.length
                        ).toFixed(1)
                      : '0',
                  color: 'bg-purple-50 text-purple-700',
                },
              ].map((c) => (
                <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
                  <p className="text-xs font-medium opacity-70">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#1A2332]">
                    Rekap Rapor — {kelasNama}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Semester {filter.semester} · TA {filter.tahun_ajaran}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">#</th>
                      <th className="px-4 py-3 text-left font-medium">Nama Siswa</th>
                      <th className="px-4 py-3 text-left font-medium">NIS</th>
                      {raporData[0]?.nilai.map((n) => (
                        <th key={n.mata_pelajaran} className="px-3 py-3 text-center font-medium whitespace-nowrap">
                          {n.mata_pelajaran}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-medium">Rata-rata</th>
                      <th className="px-4 py-3 text-center font-medium">Hadir</th>
                      <th className="px-4 py-3 text-center font-medium">Alpa</th>
                      <th className="px-4 py-3 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {raporData.map((r) => (
                      <tr key={r.siswa_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{r.ranking}</td>
                        <td className="px-4 py-3 font-medium text-[#1A2332]">{r.nama}</td>
                        <td className="px-4 py-3 text-gray-500">{r.nis}</td>
                        {r.nilai.map((n) => (
                          <td key={n.mata_pelajaran} className="px-3 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor[n.grade] || gradeColor.E}`}
                            >
                              {n.nilai_akhir} ({n.grade})
                            </span>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-semibold">{r.rata_rata}</td>
                        <td className="px-4 py-3 text-center text-emerald-600">{r.total_hadir}</td>
                        <td className="px-4 py-3 text-center text-red-500">{r.total_alpa}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'lulus'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {r.status === 'lulus' ? 'Lulus' : 'Remedial'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {raporData.length === 0 && (
                      <tr>
                        <td colSpan={20} className="px-4 py-10 text-center text-gray-400 text-sm">
                          Tidak ada data nilai untuk filter yang dipilih.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {searched && !isFetching && !raporData && (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
            Tidak ada data ditemukan.
          </div>
        )}
      </div>
    </div>
  );
}
