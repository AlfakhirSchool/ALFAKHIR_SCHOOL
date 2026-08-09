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

const MAPEL_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  MTK:  { bg: '#EFF6FF', color: '#3B82F6', icon: '📐' },
  BIN:  { bg: '#FEF9C3', color: '#CA8A04', icon: '📖' },
  IPA:  { bg: '#ECFDF5', color: '#10B981', icon: '🔬' },
  IPS:  { bg: '#FFF7ED', color: '#F97316', icon: '🌍' },
  PAI:  { bg: '#F5F3FF', color: '#8B5CF6', icon: '☪️' },
  PKN:  { bg: '#FEF2F2', color: '#EF4444', icon: '🇮🇩' },
  ENG:  { bg: '#F0F9FF', color: '#0EA5E9', icon: '🗣️' },
  SBK:  { bg: '#FDF4FF', color: '#A855F7', icon: '🎨' },
  PJOK: { bg: '#F0FDF4', color: '#16A34A', icon: '⚽' },
  DEFAULT: { bg: '#F8FAFC', color: '#64748B', icon: '📚' },
};

const MENU = [
  { href: '/tagihan',   icon: CreditCard,    label: 'Tagihan',       color: '#F97316', bg: '#FFF7ED' },
  { href: '/kehadiran', icon: CalendarCheck, label: 'Kehadiran',     color: '#10B981', bg: '#ECFDF5' },
  { href: '/tugas',     icon: FileText,      label: 'Tugas',         color: '#3B7FD1', bg: '#EBF2FF' },
  { href: '/materi',    icon: BookOpen,      label: 'Mata Pelajaran',color: '#F59E0B', bg: '#FFFBEB' },
  { href: '/tagihan',   icon: Award,         label: 'Kuitansi',      color: '#EF4444', bg: '#FEF2F2' },
  { href: '/kehadiran', icon: Clock,         label: 'Jadwal',        color: '#06B6D4', bg: '#ECFEFF' },
  { href: '/profil',    icon: Bell,          label: 'Pengumuman',    color: '#64748B', bg: '#F8FAFC' },
  { href: '/profil',    icon: User,          label: 'Profil',        color: '#8B5CF6', bg: '#F5F3FF' },
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

  const { data: mapelData } = useQuery({
    queryKey: ['portal-mapel'],
    queryFn: () => api.get('/mata-pelajaran').then(r => r.data.data),
    enabled: !isOrtu,
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

  const namaParts = user?.nama?.split(' ') || [];
  const firstName = namaParts.length > 1 ? namaParts[0] : (user?.nama || 'Pengguna');

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Hero header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #FF8C38 0%, #E8620D 100%)' }}>
        {/* Dekorasi */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/8" />
        <div className="absolute top-6 right-2 w-16 h-16 rounded-full bg-white/8" />

        <div className="px-4 pt-10 pb-6">
          {/* Top row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <img src="/logo-sd.png" alt="" className="w-7 h-7 object-contain brightness-0 invert opacity-90" />
              <p className="text-white/80 text-xs font-semibold tracking-wide">SD AL-FAKHIR</p>
            </div>
            <Link href="/profil">
              <div className="w-8 h-8 rounded-full border-2 border-white/40 bg-white/20 flex items-center justify-center">
                <span className="text-white font-black text-xs">{(user?.nama || 'P')[0].toUpperCase()}</span>
              </div>
            </Link>
          </div>

          {/* Greeting */}
          <div className="mb-5">
            <p className="text-white/60 text-xs mb-1">Selamat datang</p>
            <h1 className="text-white font-black text-[26px] leading-none tracking-tight">{user?.nama || 'Pengguna'}</h1>
          </div>

          {/* Stats pills */}
          <div className="flex gap-2">
            <div className="flex-1 bg-black/15 rounded-2xl px-3 py-2.5">
              <p className="text-white/50 text-[9px] font-semibold uppercase tracking-widest mb-1">Kelas</p>
              <div className="flex items-center gap-1.5">
                <BookOpen size={12} className="text-white/70" />
                <p className="text-white font-bold text-sm">{siswaData?.kelas?.nama || '—'}</p>
              </div>
            </div>
            <div className="flex-1 bg-black/15 rounded-2xl px-3 py-2.5">
              <p className="text-white/50 text-[9px] font-semibold uppercase tracking-widest mb-1">Kehadiran</p>
              <div className="flex items-center gap-1.5">
                <CalendarCheck size={12} className="text-white/70" />
                <p className="text-white font-bold text-sm">—</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="h-6 bg-[#F0F2F5] rounded-t-[28px]" />
      </div>

      <div className="px-3 pb-28 space-y-4 mt-4">

        {/* Menu grid */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Menu Layanan</p>
          <div className="grid grid-cols-4 gap-2">
            {MENU.map(({ href, icon: Icon, label, color, bg }) => (
              <Link key={label} href={href}
                className="bg-white rounded-2xl py-3 px-1 flex flex-col items-center gap-1.5 shadow-sm active:scale-95 transition-transform">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} strokeWidth={2} />
                </div>
                <span className="text-[9.5px] font-semibold text-gray-500 text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mata Pelajaran */}
        {!isOrtu && mapelData && mapelData.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mata Pelajaran</p>
            <Link href="/materi" className="text-xs font-semibold text-[#F97316]">Lihat semua →</Link>
          </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
              {mapelData.map((m: any) => {
                const style = MAPEL_COLORS[m.kode] || MAPEL_COLORS.DEFAULT;
                return (
                  <Link key={m.id} href={`/materi?mapel=${m.id}`}
                    className="flex-shrink-0 bg-white rounded-2xl p-3 w-28 shadow-sm text-left active:scale-95 transition-transform">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: style.bg }}>
                      <BookOpen size={16} style={{ color: style.color }} strokeWidth={2} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-700 leading-tight">{m.nama}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">KKM {m.kkm || 75}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

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
