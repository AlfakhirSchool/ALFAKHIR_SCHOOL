'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    lunas:      { label: 'Lunas',       cls: 'bg-green-50 text-green-600 border-green-200',  icon: CheckCircle },
    sebagian:   { label: 'Sebagian',    cls: 'bg-yellow-50 text-yellow-600 border-yellow-200', icon: Clock },
    belum_bayar:{ label: 'Belum Bayar', cls: 'bg-red-50 text-red-600 border-red-200',         icon: AlertCircle },
  };
  const { label, cls, icon: Icon } = map[status] || map.belum_bayar;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      <Icon size={10} /> {label}
    </span>
  );
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

  if (!isSiswa) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-800">Tagihan</h1>
        <div className="text-center py-16 text-gray-400">
          <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Fitur tagihan siswa</p>
          <p className="text-xs mt-1">Tersedia untuk akun siswa</p>
        </div>
      </div>
    );
  }

  const tagihan = data?.data || [];
  const total = tagihan.reduce((s: number, t: any) => s + Number(t.nominal_biaya), 0);
  const terbayar = tagihan.reduce((s: number, t: any) => s + Number(t.nominal_terbayar), 0);
  const tunggakan = total - terbayar;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">Tagihan</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Tagihan', value: total,     color: '#3B7FD1' },
          { label: 'Terbayar',      value: terbayar,  color: '#10B981' },
          { label: 'Tunggakan',     value: tunggakan,  color: '#EF4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-[10px] text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-bold" style={{ color }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Memuat...</div>
      ) : tagihan.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CreditCard size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Tidak ada tagihan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tagihan.map((t: any) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{t.jenis_biaya}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.tahun_ajaran}</p>
                  {t.tanggal_jatuh_tempo && (
                    <p className="text-xs text-gray-400">
                      Jatuh tempo: {new Date(t.tanggal_jatuh_tempo).toLocaleDateString('id-ID')}
                    </p>
                  )}
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-600">
                <span>Tagihan: <strong>{fmt(t.nominal_biaya)}</strong></span>
                <span>Terbayar: <strong className="text-green-600">{fmt(t.nominal_terbayar)}</strong></span>
              </div>
              {t.status !== 'lunas' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-green-500"
                      style={{ width: `${Math.min(100, (t.nominal_terbayar / t.nominal_biaya) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Sisa: {fmt(Number(t.nominal_biaya) - Number(t.nominal_terbayar))}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
