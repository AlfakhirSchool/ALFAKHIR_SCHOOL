'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard, CalendarCheck, BookOpen, Bell,
  ChevronRight, AlertCircle, FileText, Clock,
  Inbox,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const MAPEL_COLORS: Record<string, { bg: string; color: string }> = {
  MTK:  { bg: '#EFF6FF', color: '#3B82F6' },
  BIN:  { bg: '#FEF9C3', color: '#CA8A04' },
  IPA:  { bg: '#ECFDF5', color: '#10B981' },
  IPS:  { bg: '#FFF7ED', color: '#F97316' },
  PAI:  { bg: '#F5F3FF', color: '#8B5CF6' },
  PKN:  { bg: '#FEF2F2', color: '#EF4444' },
  ENG:  { bg: '#F0F9FF', color: '#0EA5E9' },
  SBK:  { bg: '#FDF4FF', color: '#A855F7' },
  PJOK: { bg: '#F0FDF4', color: '#16A34A' },
  DEFAULT: { bg: '#F8FAFC', color: '#64748B' },
};

const MENU = [
  { href: '/tagihan',    icon: CreditCard,    label: 'Tagihan',       color: '#F97316', bg: '#fff7ed' },
  { href: '/ruang-kelas', icon: FileText,     label: 'Tugas',          color: '#3B82F6', bg: '#eff6ff' },
  { href: '/ruang-kelas', icon: BookOpen,     label: 'Kelas',           color: '#F59E0B', bg: '#fffbeb' },
  { href: '/jadwal',     icon: Clock,         label: 'Jadwal',        color: '#06B6D4', bg: '#ecfeff' },
  { href: '/pengumuman', icon: Bell,          label: 'Pengumuman',    color: '#EF4444', bg: '#fef2f2' },
];

export default function BerandaPage() {
  const { user } = useAuthStore();
  const isOrtu = user?.role === 'ortu';

  const { data: dashboardData } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => api.get('/portal/dashboard').then(r => r.data.data),
    enabled: !isOrtu,
    staleTime: 60_000,
  });

  const siswaData = dashboardData?.siswa;
  const mapelData = dashboardData?.mapel;
  const pengumumanData: any[] = dashboardData?.pengumuman ?? [];
  const tagihanData = { data: dashboardData?.tagihan ?? [] };
  const tugasData = { data: dashboardData?.tugas ?? [] };


  const tagihan = tagihanData?.data || [];
  const belumBayar = tagihan.filter((t: any) => t.status !== 'lunas');
  const totalTunggakan = belumBayar.reduce(
    (s: number, t: any) => s + Number(t.nominal_biaya) - Number(t.nominal_terbayar), 0
  );

  const now = new Date();
  const tugasList: any[] = tugasData?.data || [];
  const tugasAktif = tugasList
    .filter((t: any) => t.deadline && new Date(t.deadline) > now)
    .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const tugasDeadline = tugasAktif[0];
  const sisaHari = tugasDeadline
    ? Math.ceil((new Date(tugasDeadline.deadline).getTime() - now.getTime()) / 86400000)
    : null;

  const hariIni = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-[#f7f9fb]">

      {/* ── HERO ── */}
      <header className="relative overflow-hidden rounded-b-[28px]"
        style={{ background: 'linear-gradient(135deg, #f47b20 0%, #ff9e4a 100%)' }}>
        {/* decorative */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)', transform: 'translate(-30%,30%)' }} />

        <div className="relative px-5 pt-10 pb-20">
          {/* Top app bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src="/logo-sd.png" alt="SD Al-Fakhir" className="w-8 h-8 object-contain drop-shadow" />
              <span className="text-white font-bold text-base tracking-tight">SD AL-FAKHIR</span>
            </div>
            <Link href="/profil"
              className="w-10 h-10 rounded-full bg-white/25 border border-white/40 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{(user?.nama || 'P')[0].toUpperCase()}</span>
            </Link>
          </div>

          {/* Greeting */}
          <div className="mb-6">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">Selamat datang</p>
            <h1 className="text-white font-black text-[28px] leading-tight tracking-tight drop-shadow-sm">
              {user?.nama || 'Pengguna'}
            </h1>
          </div>

          {/* Status badges */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-2 border border-white/30">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-xs font-semibold">Aktif</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 border border-white/20">
              <CalendarCheck size={14} className="text-white/80" />
              <span className="text-white text-xs font-medium">{hariIni}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="px-5 pt-6 pb-28 flex flex-col gap-8 -mt-4 relative z-10">

        {/* Stats cards */}
        {!isOrtu && (
          <section className="grid grid-cols-2 gap-4">
            {/* Kelas */}
            <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] border-l-4 border-[#f47b20] relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-5">
                <BookOpen size={80} strokeWidth={1} />
              </div>
              <p className="text-xs font-bold text-[#565e74] uppercase tracking-widest mb-2">KELAS</p>
              <p className="font-black text-xl text-[#191c1e] truncate">{siswaData?.kelas?.nama || '—'}</p>
            </div>
          </section>
        )}

        {/* Menu Layanan */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest pl-2 border-l-4 border-[#f47b20]">
            MENU LAYANAN
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {MENU.map(({ href, icon: Icon, label, color, bg }) => (
              <Link key={href} href={href}
                className="bg-white rounded-[20px] p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform">
                <div className="w-14 h-14 rounded-[16px] flex items-center justify-center"
                  style={{ background: bg }}>
                  <Icon size={26} style={{ color }} strokeWidth={1.8} />
                </div>
                <span className="text-xs font-semibold text-[#191c1e] text-center leading-tight whitespace-pre-line">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Mata Pelajaran */}
        {!isOrtu && mapelData && mapelData.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest pl-2 border-l-4 border-[#f47b20]">
                MATA PELAJARAN
              </h3>
              <Link href="/materi" className="text-xs font-semibold text-[#f47b20] flex items-center gap-0.5">
                Lihat semua <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide snap-x">
              {mapelData.map((m: any) => {
                const s = MAPEL_COLORS[m.kode] || MAPEL_COLORS.DEFAULT;
                return (
                  <Link key={m.id} href={`/materi?mapel=${m.id}`}
                    className="flex-shrink-0 w-40 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] rounded-[20px] p-4 flex flex-col gap-4 snap-start border border-[#f2f4f6] active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: s.bg }}>
                      <BookOpen size={22} style={{ color: s.color }} strokeWidth={1.8} />
                    </div>
                    <p className="text-xs font-bold text-[#191c1e] uppercase leading-snug">{m.nama}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Berita & Informasi */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest pl-2 border-l-4 border-[#f47b20]">
            BERITA &amp; INFORMASI
          </h3>
          {(!pengumumanData || pengumumanData.length === 0) ? (
            <div className="bg-white rounded-[20px] p-8 shadow-[0_4px_16px_rgba(15,23,42,0.06)] border border-[#f2f4f6] flex flex-col items-center justify-center gap-4 min-h-40 text-center">
              <div className="w-16 h-16 rounded-full bg-[#eceef0] flex items-center justify-center">
                <Inbox size={32} className="text-[#565e74]/50" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-bold text-sm text-[#191c1e] mb-1">Tidak ada berita</p>
                <p className="text-xs text-[#565e74]">Belum ada informasi terbaru saat ini.</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide">
              {pengumumanData.map((item: any, i: number) => {
                const dark = i === 0;
                return (
                  <div key={item.id}
                    className="flex-shrink-0 w-52 rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
                    style={{ background: dark ? 'linear-gradient(135deg, #f47b20 0%, #ff9e4a 100%)' : '#f2f4f6' }}>
                    <div className="p-4">
                      {item.kategori && (
                        <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full mb-3"
                          style={dark
                            ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                            : { background: '#fff7ed', color: '#f47b20' }}>
                          {item.kategori}
                        </span>
                      )}
                      <p className={`font-black text-sm leading-snug mb-1.5 ${dark ? 'text-white' : 'text-[#191c1e]'}`}>
                        {item.judul}
                      </p>
                      <p className={`text-[11px] leading-relaxed line-clamp-3 ${dark ? 'text-white/75' : 'text-[#565e74]'}`}>
                        {item.isi}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tugas deadline */}
        {!isOrtu && tugasDeadline && (
          <section>
            <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest pl-2 border-l-4 border-blue-400 mb-3">
              {sisaHari === 1 ? 'DEADLINE BESOK!' : `${sisaHari} HARI LAGI`}
            </h3>
            <Link href="/tugas"
              className="bg-white rounded-[20px] shadow-[0_4px_16px_rgba(15,23,42,0.06)] flex items-center p-4 gap-4 active:scale-95 transition-transform">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[#565e74] mb-0.5">Deadline tugas</p>
                <p className="font-black text-base text-[#191c1e] truncate">{tugasDeadline.judul}</p>
                <p className="text-xs text-[#565e74] mt-0.5">
                  {new Date(tugasDeadline.deadline).toLocaleDateString('id-ID', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </p>
              </div>
              <div className="w-16 h-16 rounded-[16px] flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f47b20 0%, #ff9e4a 100%)' }}>
                <FileText size={28} className="text-white/90" strokeWidth={1.5} />
              </div>
            </Link>
          </section>
        )}

        {/* Tunggakan */}
        {!isOrtu && belumBayar.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest pl-2 border-l-4 border-red-400 mb-3">
              PERLU PERHATIAN
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
              {belumBayar.slice(0, 5).map((t: any) => (
                <Link key={t.id} href="/tagihan"
                  className="flex-shrink-0 w-60 bg-white rounded-[20px] p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] border border-red-50 active:scale-95 transition-transform">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                      <AlertCircle size={16} className="text-red-500" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold">
                      {t.status === 'sebagian' ? 'Sebagian' : 'Belum Bayar'}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-[#191c1e] mb-0.5">{t.jenis_biaya}</p>
                  <p className="text-xs text-[#565e74]">{t.tahun_ajaran}</p>
                  <p className="text-sm font-black text-[#191c1e] mt-2">{fmt(Number(t.nominal_biaya) - Number(t.nominal_terbayar))}</p>
                  <p className="text-[10px] text-[#565e74]">sisa tagihan</p>
                </Link>
              ))}
              {belumBayar.length > 5 && (
                <Link href="/tagihan"
                  className="flex-shrink-0 w-28 bg-white rounded-[20px] p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                    <ChevronRight size={18} className="text-[#f47b20]" />
                  </div>
                  <p className="text-xs text-center text-[#565e74]">+{belumBayar.length - 5} lainnya</p>
                </Link>
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
