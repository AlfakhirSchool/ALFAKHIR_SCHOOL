'use client';

import Header from '@/components/layout/Header';
import { ExternalLink, Printer } from 'lucide-react';

export default function KuitansiPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <Header title="Cetak Kuitansi" />
      <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
        <p className="text-sm text-slate-500">Generator bukti pembayaran SD & SMP Islam Al Fakhir</p>
        <a href="/invoice/index.html" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-slate-400 transition-all">
          <ExternalLink size={14} /> Buka Tab Baru
        </a>
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
