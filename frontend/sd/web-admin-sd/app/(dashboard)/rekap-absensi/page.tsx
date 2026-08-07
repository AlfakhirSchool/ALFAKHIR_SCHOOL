'use client';

import { useState } from 'react';
import { BookOpen, School, Calendar, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const STATUS_STYLE: Record<string, string> = {
  hadir: 'bg-green-100 text-green-700 font-bold',
  sakit: 'bg-blue-100 text-blue-700 font-bold',
  izin:  'bg-yellow-100 text-yellow-700 font-bold',
  alfa:  'bg-red-100 text-red-700 font-bold',
};
const STATUS_LABEL: Record<string, string> = { hadir: 'H', sakit: 'S', izin: 'I', alfa: 'A' };

const BULAN_LIST = Array.from({ length: 12 }, (_, i) => ({
  val: i + 1,
  label: new Date(2024, i).toLocaleString('id-ID', { month: 'long' }),
}));

const JENJANG_COLOR: Record<string, { bg: string; text: string; ring: string; active: string }> = {
  SD:  { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-400', active: 'bg-orange-500 text-white' },
  SMP: { bg: 'bg-teal-50',   text: 'text-teal-700',   ring: 'ring-teal-400',   active: 'bg-[#1B8B87] text-white' },
  SMA: { bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-400',   active: 'bg-blue-600 text-white' },
};
const JENJANG_HEADER: Record<string, string> = {
  SD: 'bg-orange-500', SMP: 'bg-[#1B8B87]', SMA: 'bg-blue-600',
};

export default function RekapAbsensiAdminPage() {
  const now = new Date();
  const [jenjang, setJenjang] = useState('SD');
  const [kelasId, setKelasId] = useState('');
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [activeMapel, setActiveMapel] = useState(0);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const kelasByJenjang = (kelasList as any[]).filter(
    (k: any) => k.sekolah?.level === jenjang || k.sekolah?.jenjang === jenjang
  );

  const { data: rekap, isLoading } = useQuery({
    queryKey: ['rekap-data', kelasId, bulan, tahun],
    queryFn: () => api.get(`/absensi/rekap-data?kelas_id=${kelasId}&bulan=${bulan}&tahun=${tahun}`).then(r => r.data.data),
    enabled: !!kelasId,
  });

  const downloadExcel = async () => {
    if (!kelasId) return;
    const token = localStorage.getItem('access_token');
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${base}/absensi/rekap-download?kelas_id=${kelasId}&bulan=${bulan}&tahun=${tahun}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert('Gagal download'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const kelasNama = (kelasList as any[]).find((k: any) => k.id === kelasId)?.nama || 'Kelas';
    const bulanNama = new Date(tahun, bulan - 1).toLocaleString('id-ID', { month: 'long' });
    a.download = `Absensi_${kelasNama.replace(/\s+/g, '')}_${bulanNama}${tahun}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mapelData = rekap?.mapel?.[activeMapel];
  const days = rekap?.days || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A2332]">Rekap Absensi</h1>
        <p className="text-gray-500 text-sm mt-1">Rekap kehadiran siswa per mata pelajaran</p>
      </div>

      {/* Jenjang tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['SD', 'SMP', 'SMA'] as const).map(j => {
          const c = JENJANG_COLOR[j];
          const isActive = jenjang === j;
          return (
            <button key={j} onClick={() => { setJenjang(j); setKelasId(''); setActiveMapel(0); }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive ? c.active : `${c.bg} ${c.text} hover:opacity-80`}`}>
              {j}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end border border-gray-100">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Kelas {jenjang}</label>
          <select value={kelasId} onChange={e => { setKelasId(e.target.value); setActiveMapel(0); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87] min-w-[160px]">
            <option value="">-- Pilih Kelas --</option>
            {kelasByJenjang.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Bulan</label>
          <select value={bulan} onChange={e => setBulan(+e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
            {BULAN_LIST.map(b => <option key={b.val} value={b.val}>{b.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tahun</label>
          <select value={tahun} onChange={e => setTahun(+e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {kelasId && rekap && (
          <button onClick={downloadExcel}
            className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-semibold hover:bg-[#156f6c] flex items-center gap-2">
            <Download size={14} className="inline mr-1" />Download Excel
          </button>
        )}
      </div>

      {!kelasId && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 border border-gray-100">
          Pilih kelas untuk melihat rekap absensi
        </div>
      )}

      {kelasId && isLoading && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">Memuat data...</div>
      )}

      {rekap && (
        <>
          <div className={`${JENJANG_HEADER[jenjang] || 'bg-[#1B8B87]'} text-white rounded-xl p-4 mb-4 flex items-center justify-between`}>
            <div>
              <p className="font-bold text-lg">{rekap.namaSekolah || 'Al Fakhir School'}</p>
              <p className="text-sm text-white/80">Rekap Absensi Bulanan · Kelas {rekap.kelas} · {rekap.namaBulan} {rekap.tahun}</p>
            </div>
            <div className="text-right text-sm text-white/80">
              <p>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          {rekap.mapel?.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
              Belum ada data absensi untuk kelas dan bulan ini
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                {rekap.mapel?.map((mp: any, i: number) => (
                  <button key={mp.id} onClick={() => setActiveMapel(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeMapel === i
                        ? 'bg-[#1B8B87] text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}>
                    {mp.nama}
                  </button>
                ))}
              </div>

              {mapelData && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="p-4 border-b border-gray-100 text-sm text-gray-500 flex gap-6">
                    <span className="inline-flex items-center gap-1"><BookOpen size={14} /><strong className="text-gray-700">{mapelData.nama}</strong></span>
                    <span className="inline-flex items-center gap-1"><School size={14} />Kelas <strong className="text-gray-700">{rekap.kelas}</strong></span>
                    <span className="inline-flex items-center gap-1"><Calendar size={14} /><strong className="text-gray-700">{rekap.namaBulan} {rekap.tahun}</strong></span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#1A2332] text-white">
                          <th className="px-3 py-2 text-left sticky left-0 bg-[#1A2332] z-10 min-w-[40px]">No</th>
                          <th className="px-3 py-2 text-left sticky left-10 bg-[#1A2332] z-10 min-w-[180px]">Nama Siswa</th>
                          {days.map((d: any) => (
                            <th key={d.tgl}
                              className={`px-1 py-1 text-center min-w-[32px] ${d.libur ? 'bg-gray-600' : ''}`}>
                              <div>{d.tgl}</div>
                              <div className="text-gray-300 font-normal">{d.hari}</div>
                            </th>
                          ))}
                          <th className="px-2 py-2 text-center bg-green-800">H</th>
                          <th className="px-2 py-2 text-center bg-blue-800">S</th>
                          <th className="px-2 py-2 text-center bg-yellow-700">I</th>
                          <th className="px-2 py-2 text-center bg-red-800">A</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mapelData.siswa.map((s: any, idx: number) => (
                          <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-center sticky left-0 bg-inherit z-10 border-r border-gray-100">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-[#1A2332] sticky left-10 bg-inherit z-10 border-r border-gray-100">{s.nama}</td>
                            {days.map((d: any) => {
                              if (d.libur) return (
                                <td key={d.tgl} className="px-1 py-2 text-center text-gray-300 bg-gray-50">—</td>
                              );
                              const st = s.absensi[d.tgl];
                              return (
                                <td key={d.tgl} className="px-1 py-2 text-center">
                                  {st ? (
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${STATUS_STYLE[st] || ''}`}>
                                      {STATUS_LABEL[st] || st}
                                    </span>
                                  ) : <span className="text-gray-200">·</span>}
                                </td>
                              );
                            })}
                            <td className="px-2 py-2 text-center font-bold text-green-700">{s.H}</td>
                            <td className="px-2 py-2 text-center font-bold text-blue-700">{s.S}</td>
                            <td className="px-2 py-2 text-center font-bold text-yellow-700">{s.I}</td>
                            <td className="px-2 py-2 text-center font-bold text-red-700">{s.A}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                          <td className="px-3 py-2 sticky left-0 bg-gray-100 z-10"></td>
                          <td className="px-3 py-2 text-right sticky left-10 bg-gray-100 z-10 text-gray-600 text-xs uppercase tracking-wide border-r border-gray-200">Total Hadir</td>
                          {days.map((d: any) => {
                            if (d.libur) return <td key={d.tgl} className="px-1 py-2 text-center text-gray-300">—</td>;
                            const total = mapelData.siswa.filter((s: any) => s.absensi[d.tgl] === 'hadir').length;
                            return <td key={d.tgl} className="px-1 py-2 text-center text-[#1B8B87]">{total || ''}</td>;
                          })}
                          <td colSpan={4}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex gap-4 flex-wrap text-xs text-gray-600">
                    <span className="font-semibold">Keterangan:</span>
                    <span><span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-700 font-bold mr-1">H</span>Hadir</span>
                    <span><span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700 font-bold mr-1">S</span>Sakit</span>
                    <span><span className="inline-flex items-center justify-center w-5 h-5 rounded bg-yellow-100 text-yellow-700 font-bold mr-1">I</span>Izin</span>
                    <span><span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-100 text-red-700 font-bold mr-1">A</span>Alpa</span>
                    <span className="text-gray-300 ml-2">— Hari Minggu / Libur</span>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
