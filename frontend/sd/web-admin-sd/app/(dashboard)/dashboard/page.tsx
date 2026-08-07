'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Users, LayoutGrid, CheckCircle, ArrowRight, Wallet } from 'lucide-react';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';

const SCHOOLS = [
  {
    key: 'sd',
    label: 'SD',
    fullName: 'Sekolah Dasar',
    desc: 'Kelola siswa, kelas, absensi, dan nilai jenjang SD',
    color: '#16A34A',
    gradient: 'from-green-500 to-green-700',
    light: 'bg-green-50',
    ring: 'ring-green-200',
    text: 'text-green-700',
    logo: '/logo-sd.png',
    href: '/dashboard/sd',
  },
  {
    key: 'smp',
    label: 'SMP',
    fullName: 'Sekolah Menengah Pertama',
    desc: 'Kelola siswa, kelas, absensi, dan nilai jenjang SMP',
    color: '#1B8B87',
    gradient: 'from-teal-500 to-teal-700',
    light: 'bg-teal-50',
    ring: 'ring-teal-200',
    text: 'text-teal-700',
    logo: '/logo-smp.png',
    href: '/dashboard/smp',
  },
  {
    key: 'sma',
    label: 'SMA',
    fullName: 'Sekolah Menengah Atas',
    desc: 'Kelola siswa, kelas, absensi, dan nilai jenjang SMA',
    color: '#3B7FD1',
    gradient: 'from-blue-500 to-blue-700',
    light: 'bg-blue-50',
    ring: 'ring-blue-200',
    text: 'text-blue-700',
    logo: '/logo-sma.png',
    href: '/dashboard/sma',
  },
] as const;

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };
const stagger = { show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };

export default function DashboardSelectPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['admin-dashboard-v2'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
    enabled: user?.role !== 'guru' && user?.role !== 'pewawancara' && user?.role !== 'keuangan',
  });

  useEffect(() => {
    if (user?.role === 'guru' || user?.role === 'pewawancara') router.replace('/dashboard/pewawancara');
    if (user?.role === 'keuangan') router.replace('/dashboard/keuangan');
  }, [user, router]);

  if (user?.role === 'guru' || user?.role === 'pewawancara' || user?.role === 'keuangan') return null;

  const sekolah = data?.sekolah || {};

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <Header title="Pilih Dashboard" />
      <div className="flex flex-col items-center px-6 py-16">

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-14">
          <h1 className="text-3xl font-black text-[#1A2332] mb-3">Masuk ke Dashboard</h1>
          <p className="text-gray-400 text-base">Pilih jenjang yang ingin Anda kelola</p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {SCHOOLS.map((s) => {
            const d = sekolah[s.key] || { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
            return (
              <motion.button
                key={s.key}
                variants={fadeUp}
                onClick={() => router.push(s.href)}
                whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,0,0,0.13)' }}
                whileTap={{ scale: 0.97 }}
                className="bg-white rounded-3xl shadow-sm overflow-hidden text-left group"
              >
                {/* Banner */}
                <div className={`bg-gradient-to-br ${s.gradient} p-8 flex flex-col items-center justify-center text-white relative overflow-hidden min-h-[220px]`}>
                  {/* Decorative circles */}
                  <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
                  <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/10" />

                  <motion.div
                    whileHover={{ rotate: [0, -6, 6, 0], scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                    className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg p-1.5 relative z-10"
                  >
                    <Image src={s.logo} alt={`Logo ${s.label}`} width={72} height={72} className="object-contain w-full h-full" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-center relative z-10">{s.fullName}</h2>
                </div>

                {/* Stats */}
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { icon: Users,       val: d.totalSiswa,     label: 'Siswa' },
                      { icon: LayoutGrid,  val: d.totalKelas,     label: 'Kelas' },
                      { icon: CheckCircle, val: d.absensiHariIni, label: 'Hadir' },
                    ].map(({ icon: Icon, val, label }) => (
                      <div key={label} className={`${s.light} rounded-xl p-3 text-center`}>
                        <Icon size={14} className={`mx-auto mb-1 ${s.text}`} />
                        <p className={`text-lg font-black ${s.text}`}>{val}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 mb-5 text-center leading-relaxed">{s.desc}</p>

                  <div className={`w-full py-3 rounded-xl text-white text-sm font-bold text-center bg-gradient-to-r ${s.gradient} flex items-center justify-center gap-2 group-hover:gap-3 transition-all duration-200`}>
                    Masuk Dashboard {s.label}
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Keuangan card */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mt-8 w-full max-w-4xl">
          <motion.button
            onClick={() => router.push('/dashboard/keuangan')}
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-white rounded-2xl shadow-sm border border-teal-100 p-6 flex items-center gap-5 text-left group"
          >
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center shrink-0">
              <Wallet size={26} className="text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">Dashboard Keuangan</h3>
              <p className="text-sm text-gray-400">Rekap tagihan, pembayaran, dan tunggakan siswa</p>
            </div>
            <ArrowRight size={18} className="text-gray-300 group-hover:text-teal-500 transition-colors" />
          </motion.button>
        </motion.div>

        <div className="mt-8">
          <button
            onClick={() => router.push('/dashboard/master')}
            className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
          >
            ···
          </button>
        </div>
      </div>
    </div>
  );
}
