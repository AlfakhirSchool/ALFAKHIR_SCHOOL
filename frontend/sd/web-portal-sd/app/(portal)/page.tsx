'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard, CalendarCheck, BookOpen, Bell, User,
  ChevronRight, AlertCircle, FileText, Award, Clock
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const MENU = [
  { href: '/tagihan',   icon: CreditCard,    label: 'Tagihan',    color: '#F97316', bg: '#FFF7ED' },
  { href: '/kehadiran', icon: CalendarCheck, label: 'Kehadiran',  color: '#10B981', bg: '#ECFDF5' },
  { href: '/tugas',     icon: BookOpen,      label: 'Tugas',      color: '#3B7FD1', bg: '#EBF2FF' },
  { href: '/profil',    icon: User,          label: 'Profil',     color: '#8B5CF6', bg: '#F5F3FF' },
  { href: '/tagihan',   icon: FileText,      label: 'Kuitansi',   color: '#EF4444', bg: '#FEF2F2' },
  { href: '/kehadiran', icon: Award,         label: 'Prestasi',   color: '#F59E0B', bg: '#FFFBEB' },
  { href: '/tugas',     icon: Clock,         label: 'Jadwal',     color: '#06B6D4', bg: '#ECFEFF' },
  { href: '/profil',    icon: Bell,          label: 'Pengumuman', color: '#64748B', bg: '#F8FAFC' },
];

export default function BerandaPage() {
  const { user } = useAuthStore();
  const isOrtu = user?.role === 'ortu';

  const { data: siswaData } = useQuery({
    queryKey: ['portal-siswa-me'],
    queryFn: () => api.get('/siswa/me').then(r => r.data.data),
    enabled: !isOrtu,
  });

  const { data: tagihanData } = useQuery({
    queryKey: ['portal-tagihan-summary', siswaData?.id],
    queryFn: () => api.get('/pembayaran', { params: { siswa_id: siswaData?.id } }).then(r => r.data),
    enabled: !isOrtu && !!siswaData?.id,
  });

  const { data: tugasData } = useQuery({
    queryKey: ['portal-tugas-summary', siswaData?.kelas_id],
    queryFn: () => api.get('/tugas', { params: { kelas_id: siswaData?.kelas_id } }).then(r => r.data),
    enabled: !isOrtu && !!siswaData?.kelas_id,
  });

  const tagihan = tagihanData?.data || [];
  const belumBayar = tagihan.filter((t: any) => t.status !== 'lunas');
  const totalTunggakan = belumBayar.reduce(
    (s: number, t: any) => s + Number(t.nominal_biaya) - Number(t.nominal_terbayar), 0
  );

  const tugasList: any[] = tugasData?.data || [];
  const now = new Date();
  const tugasAktif = tugasList
    .filter((t: any) => t.deadline && new Date(t.deadline) > now)
    .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const tugasDeadline = tugasAktif[0];
  const sisaHari = tugasDeadline
    ? Math.ceil((new Date(tugasDeadline.deadline).getTime() - now.getTime()) / 86400000)
    : null;

  const firstName = user?.nama?.split(' ')[0] || 'Pengguna';

  return (
    <div className="min-h-screen bg-[#F2F2F7]">

      {/* Top bar — Qantas style */}
      <div className="bg-white px-4 pt-12 pb-4 flex items-center justify-between">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-600">
          <Bell size={15} />
          <span>Info</span>
        </button>
        <Link href="/profil"
          className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-1.5 rounded-full text-sm font-semibold">
          <img src="/logo-sd.png" alt="" className="w-5 h-5 object-contain brightness-0 invert" />
          Profil
        </Link>
      </div>

      <div className="px-4 pb-28 space-y-5 mt-4">

        {/* Greeting */}
        <div>
          <p className="text-gray-500 text-sm">Selamat datang,</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-0.5">{firstName}</h1>
        </div>

        {/* Stats card — Points/Status style */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">Tunggakan</p>
              <p className="text-xl font-bold text-gray-900">
                {isOrtu ? '—' : belumBayar.length === 0 ? 'Lunas' : fmt(totalTunggakan)}
              </p>
            </div>
            <div className="flex-1 px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <p className="text-xl font-bold" style={{
                color: isOrtu ? '#9CA3AF' : belumBayar.length === 0 ? '#10B981' : '#EF4444'
              }}>
                {isOrtu ? '—' : belumBayar.length === 0 ? 'Lunas' : `${belumBayar.length} tagihan`}
              </p>
            </div>
            <div className="w-14 flex items-center justify-center bg-[#FFF7ED]">
              <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center">
                <img src="/logo-sd.png" alt="" className="w-6 h-6 object-contain brightness-0 invert" />
              </div>
            </div>
          </div>
        </div>

        {/* Menu grid — "Book and explore" style */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Menu Layanan</h2>
          <div className="grid grid-cols-4 gap-2">
            {MENU.map(({ href, icon: Icon, label, color, bg }) => (
              <Link key={label} href={href}
                className="bg-white rounded-2xl p-3 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                  <Icon size={20} style={{ color }} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming task — "5 days until trip" style */}
        {!isOrtu && tugasDeadline && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {sisaHari === 1 ? 'Deadline besok!' : `${sisaHari} hari lagi`}
            </h2>
            <Link href="/tugas"
              className="bg-white rounded-2xl overflow-hidden shadow-sm flex items-center p-4 gap-4 active:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center">
                    <BookOpen size={11} className="text-white" />
                  </div>
                  <span className="text-xs text-gray-400">{tugasDeadline.kelas?.nama || 'Kelas'}</span>
                </div>
                <p className="text-xs text-gray-400">Deadline tugas</p>
                <p className="text-base font-bold text-gray-900 truncate">{tugasDeadline.judul}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(tugasDeadline.deadline).toLocaleDateString('id-ID', {
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#F97316] to-[#ea6b10] flex-shrink-0 flex items-center justify-center">
                <BookOpen size={32} className="text-white/80" strokeWidth={1.5} />
              </div>
            </Link>
          </div>
        )}

        {/* Alert tunggakan — horizontal scroll cards style */}
        {!isOrtu && belumBayar.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Perlu Perhatian</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {belumBayar.slice(0, 5).map((t: any) => (
                <Link key={t.id} href="/tagihan"
                  className="flex-shrink-0 w-64 bg-white rounded-2xl p-4 shadow-sm border border-red-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                      <AlertCircle size={16} className="text-red-500" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                      {t.status === 'sebagian' ? 'Sebagian' : 'Belum Bayar'}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-gray-800 mb-0.5">{t.jenis_biaya}</p>
                  <p className="text-xs text-gray-400">{t.tahun_ajaran}</p>
                  <p className="text-sm font-bold text-gray-900 mt-2">{fmt(Number(t.nominal_biaya) - Number(t.nominal_terbayar))}</p>
                  <p className="text-[10px] text-gray-400">sisa tagihan</p>
                </Link>
              ))}

              {belumBayar.length > 5 && (
                <Link href="/tagihan"
                  className="flex-shrink-0 w-32 bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                    <ChevronRight size={18} className="text-[#F97316]" />
                  </div>
                  <p className="text-xs text-center text-gray-500">+{belumBayar.length - 5} lainnya</p>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Ortu placeholder */}
        {isOrtu && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
              <User size={24} className="text-[#F97316]" />
            </div>
            <p className="font-semibold text-gray-800 text-sm">Portal Orang Tua</p>
            <p className="text-xs text-gray-400 mt-1">Fitur lengkap akan segera tersedia</p>
          </div>
        )}

      </div>
    </div>
  );
}
