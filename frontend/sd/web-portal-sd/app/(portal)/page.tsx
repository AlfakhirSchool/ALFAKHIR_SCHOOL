'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, CalendarCheck, BookOpen, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

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

  const tagihan = tagihanData?.data || [];
  const belumBayar = tagihan.filter((t: any) => t.status !== 'lunas');
  const totalTunggakan = belumBayar.reduce((s: number, t: any) => s + Number(t.nominal_biaya) - Number(t.nominal_terbayar), 0);

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-[#F97316] to-[#ea6b10] rounded-2xl p-5 text-white">
        <p className="text-orange-200 text-sm">Selamat datang,</p>
        <p className="text-xl font-bold mt-0.5">{user?.nama}</p>
        <p className="text-orange-100 text-xs mt-1 capitalize">{isOrtu ? 'Portal Orang Tua' : 'Portal Siswa'}</p>
      </div>

      {/* Alert tunggakan */}
      {belumBayar.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Ada {belumBayar.length} tagihan belum lunas</p>
            <p className="text-xs text-red-500 mt-0.5">Total: {fmt(totalTunggakan)}</p>
          </div>
        </div>
      )}

      {/* Menu cepat */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/tagihan',   icon: CreditCard,    label: 'Tagihan',    color: '#3B7FD1', bg: '#EBF2FF' },
          { href: '/kehadiran', icon: CalendarCheck, label: 'Kehadiran',  color: '#10B981', bg: '#ECFDF5' },
          { href: '/tugas',     icon: BookOpen,      label: 'Tugas',      color: '#F59E0B', bg: '#FFFBEB' },
        ].map(({ href, icon: Icon, label, color, bg }) => (
          <Link key={href} href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 bg-white shadow-sm active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </Link>
        ))}
      </div>

      {/* Tagihan terbaru */}
      {tagihan.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <p className="font-semibold text-sm text-gray-800">Tagihan Terbaru</p>
            <Link href="/tagihan" className="text-xs text-[#F97316] flex items-center gap-0.5">
              Lihat semua <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {tagihan.slice(0, 3).map((t: any) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.jenis_biaya}</p>
                  <p className="text-xs text-gray-400">{t.tahun_ajaran}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{fmt(t.nominal_biaya)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    t.status === 'lunas' ? 'bg-green-50 text-green-600' :
                    t.status === 'sebagian' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {t.status === 'lunas' ? 'Lunas' : t.status === 'sebagian' ? 'Sebagian' : 'Belum Bayar'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
