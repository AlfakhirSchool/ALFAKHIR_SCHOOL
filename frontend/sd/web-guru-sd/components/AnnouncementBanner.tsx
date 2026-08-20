'use client';

import { useEffect, useState } from 'react';

const BANNER_KEY = 'alfakhir_banner_feedback_v1';

export default function AnnouncementBanner({ feedbackPath = '/feedback' }: { feedbackPath?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(BANNER_KEY)) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="sticky top-0 z-10 bg-[#1B8B87] text-white text-sm px-4 py-2.5 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <span className="text-base">💬</span>
        <span>
          Ada bug atau kendala? Bantu kami tingkatkan sistem —{' '}
          <a href={feedbackPath} className="underline font-semibold hover:text-teal-100">
            laporkan di Saran &amp; Pertanyaan
          </a>
        </span>
      </span>
      <button onClick={dismiss} className="shrink-0 text-white/80 hover:text-white text-lg leading-none">×</button>
    </div>
  );
}
