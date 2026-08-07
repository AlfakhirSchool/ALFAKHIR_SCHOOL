'use client';

import Header from '@/components/layout/Header';
import KuitansiApp from './KuitansiApp';

export default function KuitansiPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <Header title="Cetak Kuitansi" />
      <KuitansiApp />
    </div>
  );
}
