'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { School, Calendar, BookOpen, ClipboardList, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const KpiCard = ({ title, value, icon, color, delay = 0 }: { title: string; value: number; icon: import('react').ReactNode; color: string; delay?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const obj = useRef({ val: 0 });

  useEffect(() => {
    if (typeof value !== 'number') return;
    import('animejs').then(({ animate }) => {
      animate(obj.current, {
        val: value,
        duration: 1400,
        delay,
        ease: 'outExpo',
        round: 1,
        onUpdate: () => { if (ref.current) ref.current.textContent = String(obj.current.val); },
      });
    });
  }, [value, delay]);

  return (
    <motion.div
      className={`bg-white rounded-xl p-6 border-l-4 ${color} shadow-sm`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-[#1A2332] mt-1">
            <span ref={ref}>0</span>
          </p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </motion.div>
  );
};

export default function DashboardGuruPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['guru-dashboard'],
    queryFn: () => api.get('/dashboard/guru').then(r => r.data.data),
  });

  const kpi = data?.kpi || {};
  const jadwalHariIni = data?.jadwalHariIni || [];
  const pendingJurnal = data?.pendingJurnal || [];
  const schoolLevels: string[] = data?.school_levels || [];

  const [rekapKelas, setRekapKelas] = useState('');
  const [rekapLoading, setRekapLoading] = useState(false);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-guru'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const downloadRekap = async () => {
    if (!rekapKelas) return;
    setRekapLoading(true);
    try {
      const now = new Date();
      const token = localStorage.getItem('access_token');
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${base}/absensi/rekap-download?kelas_id=${rekapKelas}&bulan=${now.getMonth() + 1}&tahun=${now.getFullYear()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const kelasNama = (kelasList as any[]).find((k: any) => k.id === rekapKelas)?.nama || 'Kelas';
      const bulanNama = now.toLocaleString('id-ID', { month: 'long' });
      a.download = `Absensi_${kelasNama.replace(/\s+/g, '')}_${bulanNama}${now.getFullYear()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Gagal download rekap'); }
    finally { setRekapLoading(false); }
  };

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <Header title="Dashboard Guru" />
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-[#1A2332]">Selamat datang, {user?.nama} 👋</h2>
              <p className="text-gray-500 text-sm mt-1">{today}</p>
            </div>
            {schoolLevels.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {schoolLevels.map(lvl => {
                  const cfg: Record<string, { bg: string; text: string; label: string }> = {
                    SD:  { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Guru SD' },
                    SMP: { bg: 'bg-teal-100',   text: 'text-teal-700',   label: 'Guru SMP' },
                    SMA: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Guru SMA' },
                  };
                  const c = cfg[lvl] || { bg: 'bg-gray-100', text: 'text-gray-700', label: `Guru ${lvl}` };
                  return (
                    <span key={lvl} className={`${c.bg} ${c.text} text-sm font-bold px-4 py-1.5 rounded-full`}>
                      {c.label}
                    </span>
                  );
                })}
                {schoolLevels.length > 1 && (
                  <span className="text-xs text-gray-400 font-medium">Guru Gabungan</span>
                )}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat data...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard title="Kelas Saya" value={kpi.totalKelas || 0} icon={<School size={28} />} color="border-[#1B8B87]" delay={0} />
              <KpiCard title="Jadwal Hari Ini" value={kpi.jadwalHariIni || 0} icon={<Calendar size={28} />} color="border-[#3B7FD1]" delay={100} />
              <KpiCard title="Jurnal Pending" value={kpi.jurnalPending || 0} icon={<BookOpen size={28} />} color="border-yellow-500" delay={200} />
              <KpiCard title="Nilai Belum Input" value={kpi.nilaiPending || 0} icon={<ClipboardList size={28} />} color="border-[#FF8C42]" delay={300} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-[#1A2332] mb-4 flex items-center gap-2">
                  <Calendar size={16} /> Jadwal Hari Ini
                </h3>
                {jadwalHariIni.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Tidak ada jadwal hari ini</p>
                ) : (
                  <div className="space-y-3">
                    {jadwalHariIni.map((j: any, i: number) => (
                      <motion.div key={j.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.3 }}
                        whileHover={{ backgroundColor: '#f0fdfa', scale: 1.01 }}
                      >
                        <div>
                          <p className="font-medium text-sm text-[#1A2332]">{j.mataPelajaran?.nama}</p>
                          <p className="text-xs text-gray-500">{j.kelas?.nama} · {j.ruangan}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#1B8B87]">{j.jam_mulai} - {j.jam_selesai}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-[#1A2332] mb-4 flex items-center gap-2">
                  <BookOpen size={16} /> Jurnal Belum Disubmit
                </h3>
                {pendingJurnal.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Semua jurnal sudah disubmit</p>
                ) : (
                  <div className="space-y-3">
                    {pendingJurnal.map((j: any) => (
                      <div key={j.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <div>
                          <p className="font-medium text-sm text-[#1A2332]">{j.topik_pelajaran}</p>
                          <p className="text-xs text-gray-500">{j.kelas?.nama} · {new Date(j.tanggal).toLocaleDateString('id-ID')}</p>
                        </div>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Draft</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Download Rekap Absensi */}
            <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-teal-100">
              <h3 className="font-semibold text-[#1A2332] mb-4 flex items-center gap-2">
                <Download size={16} /> Download Rekap Absensi Bulan Ini
              </h3>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Pilih Kelas</label>
                  <select
                    value={rekapKelas}
                    onChange={e => setRekapKelas(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {(kelasList as any[]).map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={downloadRekap}
                  disabled={!rekapKelas || rekapLoading}
                  className="px-5 py-2.5 bg-[#1B8B87] text-white rounded-lg text-sm font-semibold hover:bg-[#156f6c] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {rekapLoading ? <><Loader2 size={14} className="inline mr-1 animate-spin" />Mengunduh...</> : <><Download size={14} className="inline mr-1" />Download Excel</>}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Nama file: Absensi_[Kelas]_{new Date().toLocaleString('id-ID', { month: 'long' })}{new Date().getFullYear()}.xlsx
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
