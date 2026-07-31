'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { QrCode, Download, Printer } from 'lucide-react';

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://admin.smpialfakhir.sch.id';

const PORTALS = [
  {
    key: 'form',
    label: 'Portal Pendaftaran',
    sub: 'Formulir Mandiri Siswa & Orang Tua',
    path: '/form',
    color: '#1B8B87',
    bg: 'from-teal-500 to-teal-700',
    icon: '📋',
  },
  {
    key: 'tes',
    label: 'Portal Akademik',
    sub: 'Ujian Seleksi Akademik',
    path: '/tes',
    color: '#6366F1',
    bg: 'from-indigo-500 to-indigo-700',
    icon: '🎓',
  },
];

function qrUrl(url: string, size = 220) {
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(url)}&choe=UTF-8&chld=M|2`;
}

export default function QrPortalPage() {
  const [origin, setOrigin] = useState('https://admin.smpialfakhir.sch.id');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const download = (path: string, label: string) => {
    const url = qrUrl(origin + path, 400);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${label.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const print = () => window.print();

  return (
    <div>
      <Header title="QR Portal PPDB" />
      <div className="p-6 space-y-6 max-w-4xl mx-auto">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm">Tempel atau print QR ini di meja pendaftaran, brosur, atau spanduk PPDB.</p>
          </div>
          <button onClick={print}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors print:hidden">
            <Printer size={16} /> Print Semua
          </button>
        </div>

        {/* QR Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PORTALS.map(p => {
            const url = origin + p.path;
            return (
              <div key={p.key} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header gradient */}
                <div className={`bg-gradient-to-br ${p.bg} p-6 text-white text-center`}>
                  <p className="text-4xl mb-2">{p.icon}</p>
                  <h2 className="text-xl font-black uppercase tracking-wide">{p.label}</h2>
                  <p className="text-white/70 text-sm mt-1">{p.sub}</p>
                </div>

                {/* QR */}
                <div className="p-8 flex flex-col items-center gap-6">
                  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-inner">
                    <img
                      src={qrUrl(url)}
                      alt={`QR ${p.label}`}
                      width={220} height={220}
                      className="block"
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-mono break-all">{url}</p>
                  </div>

                  <div className="flex gap-3 w-full print:hidden">
                    <button onClick={() => download(p.path, p.label)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-400 transition-all">
                      <Download size={16} /> Download QR
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                      style={{ backgroundColor: p.color }}>
                      Buka Portal
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Print layout - full page */}
        <style>{`
          @media print {
            header, nav, aside, .print\\:hidden { display: none !important; }
            body { background: white; }
            .print-qr { page-break-after: avoid; }
          }
        `}</style>
      </div>
    </div>
  );
}
