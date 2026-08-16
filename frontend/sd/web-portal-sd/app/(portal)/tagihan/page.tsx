'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle, Clock, AlertCircle, TrendingDown, Wallet, Receipt, Bell } from 'lucide-react';
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
  const total     = tagihan.reduce((s, t) => s + Number(t.nominal_biaya), 0);
  const terbayar  = tagihan.reduce((s, t) => s + Number(t.nominal_terbayar), 0);
  const tunggakan = total - terbayar;
  const persen    = total > 0 ? Math.round((terbayar / total) * 100) : 0;

  const lunas = tagihan.filter(t => t.status === 'lunas');
  const belum = tagihan.filter(t => t.status !== 'lunas');

  return (
    <div className="min-h-screen bg-[#f7f9fb]">

      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e9e0d8] h-16 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#ffdbc8] flex items-center justify-center overflow-hidden">
            <img src="/logo-sd.png" alt="SD Al-Fakhir" className="w-8 h-8 object-contain" />
          </div>
          <h1 className="font-bold text-[#994700] text-[22px] leading-none">SD AL-FAKHIR</h1>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#994700] hover:bg-[#ffdbc8]/40 transition-colors">
          <Bell size={22} />
        </button>
      </header>

      {/* Hero gradient */}
      <div className="pt-16">
        <div className="relative overflow-hidden rounded-b-[32px]"
          style={{ background: 'linear-gradient(135deg, #F47B20 0%, #E65C00 100%)' }}>
          <div className="absolute -top-1/2 -right-1/5 w-[300px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-1/3 -left-1/10 w-[200px] h-[200px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />

          <div className="relative px-5 pt-6 pb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1.5">TOTAL TAGIHAN</p>
            <h2 className="text-[26px] font-black text-white leading-none mb-4">{fmt(total)}</h2>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all duration-700" style={{ width: `${persen}%` }} />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-white/80">
              <span>{persen}% terbayar</span>
              <span>Sisa {fmt(tunggakan)}</span>
            </div>
          </div>
        </div>

        {/* Stats grid — overlaps hero */}
        <div className="px-5 -mt-8 relative z-10">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Terbayar',  value: fmt(terbayar),       numColor: '#4CAF50', iconBg: '#E8F5E9', Icon: Wallet },
              { label: 'Tunggakan', value: fmt(tunggakan),       numColor: '#F44336', iconBg: '#FFEBEE', Icon: TrendingDown },
              { label: 'Tagihan',   value: String(tagihan.length), numColor: '#2196F3', iconBg: '#E3F2FD', Icon: Receipt },
            ].map(({ label, value, numColor, iconBg, Icon }) => (
              <div key={label} className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-[0px_8px_24px_rgba(15,23,42,0.04)] gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: iconBg }}>
                  <Icon size={22} style={{ color: numColor }} />
                </div>
                <span className="font-bold text-base leading-none" style={{ color: numColor }}>
                  {label === 'Tagihan' ? value : value.replace('Rp ', 'Rp ').split(',')[0]}
                </span>
                <span className="text-[10px] text-[#565e74]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="px-5 pt-4 pb-28 space-y-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
            </div>
          ) : tagihan.length === 0 ? (
            <div className="bg-white rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-[0px_8px_24px_rgba(15,23,42,0.04)] mt-4 min-h-[300px]">
              <div className="w-24 h-24 rounded-2xl bg-[#FFF3E0] flex items-center justify-center mb-6">
                <CreditCard size={44} className="text-[#f47b20]" />
              </div>
              <h3 className="font-bold text-lg text-[#191c1e] mb-1.5">Tidak ada tagihan</h3>
              <p className="text-sm text-[#565e74]">Semua tagihan sudah bersih</p>
            </div>
          ) : (
            <>
              {belum.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#565e74] uppercase tracking-widest mb-2 px-1">Perlu Dibayar</p>
                  <div className="space-y-3">
                    {belum.map((t: any) => {
                      const s = STATUS[t.status] || STATUS.belum_bayar;
                      const Icon = s.icon;
                      const sisa = Number(t.nominal_biaya) - Number(t.nominal_terbayar);
                      const pct = Math.min(100, (Number(t.nominal_terbayar) / Number(t.nominal_biaya)) * 100);
                      return (
                        <div key={t.id} className="bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
                          <div className="h-1" style={{ background: s.color }} />
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                                  <Icon size={16} style={{ color: s.color }} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-[#191c1e] truncate">{t.jenis_biaya}</p>
                                  <p className="text-[10px] text-[#8b7265]">{t.tahun_ajaran}</p>
                                </div>
                              </div>
                              <span className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full"
                                style={{ background: s.bg, color: s.color }}>{s.label}</span>
                            </div>
                            {t.tanggal_jatuh_tempo && (
                              <p className="text-[10px] text-[#8b7265] mb-2">
                                Jatuh tempo: {new Date(t.tanggal_jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            )}
                            <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden mb-1.5">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-[#8b7265]">Terbayar <strong className="text-[#565e74]">{fmt(t.nominal_terbayar)}</strong></span>
                              <span className="text-[#8b7265]">Sisa <strong style={{ color: s.color }}>{fmt(sisa)}</strong></span>
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
                  <p className="text-[11px] font-bold text-[#565e74] uppercase tracking-widest mb-2 px-1">Sudah Lunas</p>
                  <div className="space-y-2">
                    {lunas.map((t: any) => (
                      <div key={t.id} className="bg-white rounded-2xl shadow-[0px_8px_16px_-4px_rgba(15,23,42,0.04)] p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={16} className="text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#191c1e] truncate">{t.jenis_biaya}</p>
                          <p className="text-[10px] text-[#8b7265]">{t.tahun_ajaran} · {fmt(t.nominal_biaya)}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#ecfdf5] text-emerald-600">Lunas</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
