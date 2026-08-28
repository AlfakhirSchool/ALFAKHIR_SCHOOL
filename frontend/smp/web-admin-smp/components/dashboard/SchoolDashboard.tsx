'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, LayoutGrid, CheckCircle, TrendingUp, GraduationCap, BookOpen, ClipboardList } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const LEVEL_CONFIG = {
  SD:  { color: '#F97316', bg: 'bg-orange-500', grad: 'from-orange-400 to-orange-600', border: 'border-orange-300', light: 'bg-orange-50',  ring: 'ring-orange-200', text: 'text-orange-600', fullName: 'Sekolah Dasar' },
  SMP: { color: '#2563EB', bg: 'bg-blue-600',   grad: 'from-blue-500 to-blue-700',    border: 'border-blue-300',   light: 'bg-blue-50',    ring: 'ring-blue-200',   text: 'text-blue-700',   fullName: 'Sekolah Menengah Pertama' },
  SMA: { color: '#7C3AED', bg: 'bg-purple-700', grad: 'from-purple-600 to-purple-800', border: 'border-purple-300', light: 'bg-purple-50', ring: 'ring-purple-200', text: 'text-purple-700', fullName: 'Sekolah Menengah Atas' },
} as const;

type Level = keyof typeof LEVEL_CONFIG;

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

function StatCard({ label, value, sub, icon: Icon, color, delay = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at top right, ${color}08 0%, transparent 70%)` }} />
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-4xl font-black tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </motion.div>
  );
}

function ProgressBar({ label, value, total, color, textColor }: {
  label: string; value: number; total: number; color: string; textColor: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="font-bold" style={{ color: textColor }}>{value} siswa ({pct}%)</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-3 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
        />
      </div>
    </div>
  );
}

export default function SchoolDashboard({ level }: { level: Level }) {
  const cfg = LEVEL_CONFIG[level];
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    const sl = user?.school_level;
    if (sl && sl !== level) router.replace(`/dashboard/${sl.toLowerCase()}`);
  }, [isAuthenticated, user, level, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-v2'],
    queryFn: () => api.get('/dashboard/admin').then((r: any) => r.data.data),
    refetchInterval: 30000,
  });

  const d = data?.sekolah?.[level.toLowerCase() as 'sd' | 'smp' | 'sma'] || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
  const belum = d.totalSiswa - d.absensiHariIni;
  const pct = d.totalSiswa > 0 ? Math.round((d.absensiHariIni / d.totalSiswa) * 100) : 0;

  const shortcuts = [
    { href: `/siswa?level=${level}`, icon: GraduationCap, label: `Data Siswa ${level}`, sub: `${d.totalSiswa} siswa terdaftar`, color: cfg.color, border: cfg.border, light: cfg.light, text: cfg.text },
    { href: `/kelas?level=${level}`, icon: BookOpen,       label: `Kelas ${level}`,       sub: `${d.totalKelas} kelas aktif`,    color: cfg.color, border: cfg.border, light: cfg.light, text: cfg.text },
    { href: '/absensi',              icon: ClipboardList,  label: 'Absensi',               sub: `${d.absensiHariIni} hadir hari ini`, color: '#16A34A', border: 'border-green-300', light: 'bg-green-50', text: 'text-green-700' },
  ];

  return (
    <div>
      <Header title={`Dashboard ${level}`} />
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="w-10 h-10 rounded-full border-4 border-gray-200"
              style={{ borderTopColor: cfg.color }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            />
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

            {/* Stats */}
            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Siswa"    value={d.totalSiswa}     icon={Users}       color={cfg.color} />
              <StatCard label="Total Kelas"    value={d.totalKelas}     icon={LayoutGrid}  color={cfg.color} />
              <StatCard label="Hadir Hari Ini" value={d.absensiHariIni} icon={CheckCircle} color="#16A34A" sub={`dari ${d.totalSiswa} siswa`} />
              <StatCard label="% Kehadiran"    value={`${pct}%`}        icon={TrendingUp}  color={pct >= 80 ? '#16A34A' : pct >= 60 ? '#F59E0B' : '#EF4444'} />
            </motion.div>

            {/* Progress kehadiran */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#1A2332] mb-5 text-sm uppercase tracking-wider">Kehadiran Hari Ini</h3>
              <div className="space-y-5">
                <ProgressBar label="Hadir"              value={d.absensiHariIni} total={d.totalSiswa} color="#22c55e" textColor="#16A34A" />
                <ProgressBar label="Belum / Tidak Hadir" value={belum}           total={d.totalSiswa} color="#f87171" textColor="#dc2626" />
              </div>
            </motion.div>

            {/* Shortcuts */}
            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shortcuts.map((s) => (
                <motion.a
                  key={s.href}
                  href={s.href}
                  variants={fadeUp}
                  whileHover={{ y: -3, boxShadow: '0 12px 30px rgba(0,0,0,0.10)' }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 ${s.border} transition-colors duration-200`}
                >
                  <div className={`w-12 h-12 rounded-xl ${s.light} flex items-center justify-center shrink-0`}>
                    <s.icon size={22} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className={`font-bold ${s.text} text-sm`}>{s.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                  </div>
                </motion.a>
              ))}
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
}
