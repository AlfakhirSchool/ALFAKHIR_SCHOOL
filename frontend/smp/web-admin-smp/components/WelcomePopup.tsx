'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomePopup({ nama }: { nama: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('just_logged_in')) {
      sessionStorage.removeItem('just_logged_in');
      setShow(true);
      const t = setTimeout(() => setShow(false), 3500);
      return () => clearTimeout(t);
    }
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop blur */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow(false)}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 bg-white rounded-3xl shadow-2xl px-10 py-8 max-w-sm w-full mx-4 text-center pointer-events-auto"
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          >
            {/* Logo */}
            <motion.div
              className="mx-auto mb-4 w-20 h-20"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', damping: 14, stiffness: 300 }}
            >
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-lg" />
            </motion.div>

            {/* Wave emoji */}
            <motion.div
              className="text-4xl mb-3"
              animate={{ rotate: [0, 20, -10, 20, 0] }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              👋
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-gray-400 text-sm font-medium">{greeting()},</p>
              <h2 className="text-xl font-bold text-[#1A2332] mt-1 leading-tight">{nama}</h2>
              <p className="text-[#3B7FD1] text-sm mt-2 font-medium">Selamat datang di Admin Dashboard</p>
            </motion.div>

            {/* Progress bar */}
            <motion.div className="mt-6 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#3B7FD1] rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 3.2, ease: 'linear' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
