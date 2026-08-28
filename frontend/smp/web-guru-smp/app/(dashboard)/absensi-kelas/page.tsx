'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const S_STYLE: Record<string, string> = {
  hadir: 'bg-green-100 text-green-700 border-green-300',
  sakit: 'bg-blue-100 text-blue-700 border-blue-300',
  izin:  'bg-yellow-100 text-yellow-700 border-yellow-300',
  alfa:  'bg-red-100 text-red-700 border-red-300',
};
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function AbsensiKelasGuruPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [kelasId, setKelasId] = useState('');
  const [tanggal, setTanggal] = useState(today);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [haidMap, setHaidMap] = useState<Record<string, number | false>>({}); // false = tidak haid, number = hari ke-
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: myJadwal = [] } = useQuery({
    queryKey: ['my-jadwal-kelas', user?.id],
    queryFn: () => api.get('/jadwal-pelajaran').then((r: any) => r.data.data || []),
    enabled: !!user,
  });

  // Kelas unik dari jadwal guru
  const kelasMap = new Map<string, any>();
  (myJadwal as any[]).forEach(j => { if (j.kelas && !kelasMap.has(j.kelas_id)) kelasMap.set(j.kelas_id, j.kelas); });
  const kelasList = Array.from(kelasMap.entries()).map(([id, k]) => ({ id, ...k }));

  const hariTanggal = HARI[new Date(tanggal + 'T00:00:00').getDay()];
  const jadwalHariIni = (myJadwal as any[]).filter(j => j.kelas_id === kelasId && j.hari === hariTanggal);

  const { data: siswaList = [], isLoading } = useQuery({
    queryKey: ['siswa-kelas', kelasId],
    queryFn: () => api.get('/kelas/' + kelasId + '/siswa').then((r: any) => (r.data.data || []).sort((a: any, b: any) => (a.user?.nama || a.nama || '').localeCompare(b.user?.nama || b.nama || '', 'id'))),
    enabled: !!kelasId,
  });

  useEffect(() => {
    if (!(siswaList as any[]).length) return;
    const init: Record<string, string> = {};
    (siswaList as any[]).forEach((s: any) => { init[s.id] = 'hadir'; });
    setStatusMap(init);
  }, [kelasId, (siswaList as any[]).length]);

  // Query berhalangan hari ini di kelas ini
  const { data: berhalanganData } = useQuery({
    queryKey: ['berhalangan-kelas', kelasId, tanggal],
    queryFn: () => api.get('/berhalangan', { params: { kelas_id: kelasId, bulan: parseInt(tanggal.split('-')[1]), tahun: parseInt(tanggal.split('-')[0]) } }).then((r: any) => r.data.data || []),
    enabled: !!kelasId,
  });

  useEffect(() => {
    if (!berhalanganData) return;
    const map: Record<string, number | false> = {};
    (berhalanganData as any[]).filter((b: any) => b.tanggal?.startsWith(tanggal)).forEach((b: any) => {
      map[b.siswa_id] = b.hari_ke ?? 1;
    });
    setHaidMap(map);
  }, [berhalanganData, tanggal]);

  const haidMut = useMutation({
    mutationFn: ({ siswa_id, hari_ke }: { siswa_id: string; hari_ke: number | null }) =>
      hari_ke ? api.post('/berhalangan', { siswa_id, tanggal, hari_ke }) : api.delete(`/berhalangan/${siswa_id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['berhalangan-kelas'] }),
  });

  const toggleHaid = (siswaId: string) => {
    const current = haidMap[siswaId];
    if (current !== false && current !== undefined) {
      setHaidMap(m => ({ ...m, [siswaId]: false }));
      haidMut.mutate({ siswa_id: siswaId, hari_ke: null });
    } else {
      setHaidMap(m => ({ ...m, [siswaId]: 1 }));
      haidMut.mutate({ siswa_id: siswaId, hari_ke: 1 });
    }
  };

  const setHariKe = (siswaId: string, hari: number) => {
    setHaidMap(m => ({ ...m, [siswaId]: hari }));
    haidMut.mutate({ siswa_id: siswaId, hari_ke: hari });
  };

  const simpanMut = useMutation({
    mutationFn: () => api.post('/absensi/bulk-kelas', {
      kelas_id: kelasId,
      tanggal,
      absensi: (siswaList as any[]).map((s: any) => ({ siswa_id: s.id, status: statusMap[s.id] || 'hadir' })),
    }),
    onSuccess: (res: any) => showToast(res.data.message || 'Absensi kelas berhasil disimpan'),
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal menyimpan', 'error'),
  });

  const setAll = (status: string) => {
    const next: Record<string, string> = {};
    (siswaList as any[]).forEach((s: any) => { next[s.id] = status; });
    setStatusMap(next);
  };

  return (
    <div>
      <Header title="Absensi Kelas" />
      <div className="p-6 space-y-5">

        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.msg}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-[#1A2332] mb-4">Pilih Kelas & Tanggal</h3>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Kelas</label>
              <select value={kelasId} onChange={e => { setKelasId(e.target.value); setStatusMap({}); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]">
                <option value="">— Pilih Kelas —</option>
                {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal</label>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]" />
            </div>
          </div>
          {kelasId && jadwalHariIni.length === 0 && (
            <p className="mt-3 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Tidak ada jadwal untuk hari {hariTanggal} di kelas ini.
            </p>
          )}
          {kelasId && jadwalHariIni.length > 0 && (
            <p className="mt-3 text-xs text-teal-700 bg-teal-50 px-3 py-2 rounded-lg">
              Akan diterapkan ke {jadwalHariIni.length} jadwal: {jadwalHariIni.map((j: any) => j.mataPelajaran?.nama || j.mata_pelajaran?.nama).join(', ')}
            </p>
          )}
        </div>

        {kelasId && (
          isLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">Memuat siswa...</div>
          ) : (siswaList as any[]).length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">Tidak ada siswa di kelas ini</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-[#1A2332]">{(siswaList as any[]).length} Siswa</h3>
                  <p className="text-xs text-gray-400">Set status lalu klik Simpan</p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400">Set semua:</span>
                  {['hadir','sakit','izin','alfa'].map(s => (
                    <button key={s} onClick={() => setAll(s)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${S_STYLE[s]}`}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {(siswaList as any[]).map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center justify-between px-6 py-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6">{i + 1}</span>
                      <div>
                        <p className="font-medium text-[#1A2332] text-sm">{s.user?.nama || s.nama}</p>
                        <p className="text-xs text-gray-400">{s.nis}{s.jenis_kelamin === 'P' ? ' · ♀' : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 items-center flex-wrap">
                      {(['hadir','sakit','izin','alfa'] as const).map(st => (
                        <button key={st} onClick={() => setStatusMap(prev => ({ ...prev, [s.id]: st }))}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            (statusMap[s.id] || 'hadir') === st ? S_STYLE[st] : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                          }`}>
                          {st[0].toUpperCase()}
                        </button>
                      ))}
                      {/* Berhalangan/Haid — hanya tampil untuk siswi */}
                      {(s.jenis_kelamin === 'P' || true) && (
                        <div className="flex items-center gap-1 ml-1">
                          <button onClick={() => toggleHaid(s.id)}
                            className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                              haidMap[s.id] ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-pink-50 hover:text-pink-500'
                            }`}>
                            🌸
                          </button>
                          {haidMap[s.id] && (
                            <select value={haidMap[s.id] as number}
                              onChange={e => setHariKe(s.id, parseInt(e.target.value))}
                              className="text-xs border border-pink-200 rounded-lg px-1 py-1 bg-pink-50 text-pink-700 focus:outline-none">
                              {[1,2,3,4,5,6,7].map(h => <option key={h} value={h}>Hari {h}</option>)}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-gray-100">
                <button onClick={() => simpanMut.mutate()} disabled={simpanMut.isPending || jadwalHariIni.length === 0}
                  className="w-full py-3 bg-[#1B8B87] hover:bg-[#156f6c] text-white font-bold rounded-xl text-sm disabled:opacity-50">
                  {simpanMut.isPending ? 'Menyimpan...' : `Simpan Absensi ${(siswaList as any[]).length} Siswa ke Semua Mata Pelajaran`}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
