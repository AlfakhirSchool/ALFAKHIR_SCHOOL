'use client';

import Header from '@/components/layout/Header';
import { Printer } from 'lucide-react';

export default function KuitansiPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <Header title="Cetak Kuitansi" />
      <div className="px-6 py-3 border-b border-slate-100 bg-white shrink-0">
        <p className="text-sm text-slate-500">Generator bukti pembayaran SD & SMP Islam Al Fakhir</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe
          src="/invoice/index.html"
          className="w-full h-full border-0"
          title="Cetak Kuitansi"
        />
      </div>
    </div>
  );
}
