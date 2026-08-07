'use client';

import { useEffect, useState } from 'react';

const BANNER_KEY = 'alfakhir_banner_feedback_v2';

export default function AnnouncementBanner({ feedbackPath = '/feedback' }: { feedbackPath?: string }) {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(BANNER_KEY)) {
      setShow(true);
      setTimeout(() => setVisible(true), 10);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(BANNER_KEY, '1');
      setShow(false);
    }, 300);
  };

  if (!show) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #0f766e 0%, #1B8B87 40%, #0e7490 100%)',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
      className="relative text-white text-sm px-4 py-2.5 flex items-center justify-between gap-3 overflow-hidden"
    >
      {/* shimmer sweep */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s infinite',
        }}
      />
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <span className="relative flex items-center gap-2.5">
        {/* pulsing dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-200" />
        </span>
        <span className="font-medium tracking-wide">
          Ada bug atau kendala? Bantu kami tingkatkan sistem —{' '}
          <a
            href={feedbackPath}
            className="font-semibold underline decoration-teal-300/60 underline-offset-2 hover:text-teal-100 hover:decoration-teal-200 transition-colors"
          >
            laporkan di Saran &amp; Pertanyaan
          </a>
        </span>
      </span>

      <button
        onClick={dismiss}
        aria-label="Tutup"
        className="relative shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-all text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}
