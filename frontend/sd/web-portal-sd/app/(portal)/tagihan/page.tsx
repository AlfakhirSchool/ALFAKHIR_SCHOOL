'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle, Clock, AlertCircle, TrendingDown, Wallet, Receipt } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const STATUS: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  lunas:       { label: 'Lunas',       bg: '#ECFDF5', color: '#10B981', icon: CheckCircle },
  sebagian:    { label: 'Sebagian',    bg: '#FFFBEB', color: '#F59E0B', icon: Clock },
  belum_bayar: { label: 'Belum Bayar', bg: '#FEF2F2', color: '#EF4444', icon: AlertCircle },
};

export default function TagihanPage() {
  const { user } = useAuthStore();
  const isSiswa = user?.role === 'siswa';

  const { data: siswaData } = useQuery({
    queryKey: ['portal-siswa-me'],
    queryFn: () => api.get('/siswa/me').then(r => r.data.data),
    enabled: isSiswa,
  });

  const siswaId = siswaData?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-tagihan', siswaId],
    queryFn: () => api.get('/pembayaran', { params: { siswa_id: siswaId } }).then(r => r.data),
    enabled: isSiswa && !!siswaId,
  });

  const tagihan: any[] = data?.data || [];
  const total    = tagihan.reduce((s, t) => s + Number(t.nominal_biaya), 0);
  const terbayar = tagihan.reduce((s, t) => s + Number(t.nominal_terbayar), 0);
  const tunggakan = total - terbayar;
  const persen   = total > 0 ? Math.round((terbayar / total) * 100) : 0;

  const lunas = tagihan.filter(t => t.status === 'lunas');
  const belum = tagihan.filter(t => t.status !== 'lunas');

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #FF8C38 0%, #E8620D 100%)' }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/8" />
        <div className="absolute top-4 right-0 w-14 h-14 rounded-full bg-white/8" />
        <div className="px-4 pt-12 pb-6 relative">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Total Tagihan</p>
          <h1 className="text-white font-black text-3xl leading-none mb-5">{fmt(total)}</h1>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${persen}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-white/70">
            <span>{persen}% terbayar</span>
            <span>Sisa {fmt(tunggakan)}</span>
          </div>
        </div>
        <div className="h-6 bg-[#F0F2F5] rounded-t-[28px]" />
      </div>

      <div className="px-4 pb-28 space-y-4">

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Terbayar',  value: terbayar,      color: '#10B981', icon: Wallet,       isCount: false },
            { label: 'Tunggakan', value: tunggakan,      color: '#EF4444', icon: TrendingDown, isCount: false },
            { label: 'Tagihan',   value: tagihan.length, color: '#3B7FD1', icon: Receipt,      isCount: true  },
          ].map(({ label, value, color, icon: Icon, isCount }) => (
            <div key={label} className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5"
                style={{ background: color + '18' }}>
                <Icon size={14} style={{ color }} />
              </div>
              <p className="font-black text-sm leading-none" style={{ color }}>
                {isCount ? value : fmt(value as number).split(',')[0]}
              </p>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
          </div>
        ) : tagihan.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
              <CreditCard size={28} className="text-orange-200" />
            </div>
            <p className="font-bold text-gray-500 text-sm">Tidak ada tagihan</p>
            <p className="text-xs text-gray-400 mt-1">Semua tagihan sudah bersih</p>
          </div>
        ) : (
          <>
            {belum.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Perlu Dibayar</p>
                <div className="space-y-3">
                  {belum.map((t: any) => {
                    const s = STATUS[t.status] || STATUS.belum_bayar;
                    const Icon = s.icon;
                    const sisa = Number(t.nominal_biaya) - Number(t.nominal_terbayar);
                    const pct = Math.min(100, (Number(t.nominal_terbayar) / Number(t.nominal_biaya)) * 100);
                    return (
                      <div key={t.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="h-1" style={{ background: s.color }} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: s.bg }}>
                                <Icon size={16} style={{ color: s.color }} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-gray-800 truncate">{t.jenis_biaya}</p>
                                <p className="text-[10px] text-gray-400">{t.tahun_ajaran}</p>
                              </div>
                            </div>
                            <span className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: s.bg, color: s.color }}>
                              {s.label}
                            </span>
                          </div>

                          {t.tanggal_jatuh_tempo && (
                            <p className="text-[10px] text-gray-400 mb-2">
                              Jatuh tempo: {new Date(t.tanggal_jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          )}

                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                          </div>

                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-400">Terbayar <strong className="text-gray-600">{fmt(t.nominal_terbayar)}</strong></span>
                            <span className="text-gray-400">Sisa <strong style={{ color: s.color }}>{fmt(sisa)}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {lunas.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Sudah Lunas</p>
                <div className="space-y-2">
                  {lunas.map((t: any) => (
                    <div key={t.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={16} className="text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{t.jenis_biaya}</p>
                        <p className="text-[10px] text-gray-400">{t.tahun_ajaran} · {fmt(t.nominal_biaya)}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                        Lunas
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
