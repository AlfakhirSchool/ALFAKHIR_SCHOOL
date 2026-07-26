'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1A2332]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
        >
          {/* Logo pulse */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative"
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-[#1B8B87]/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ borderRadius: '50%' }}
            />
            <img
              src="/logo.png"
              alt="Al Fakhir School"
              className="w-28 h-28 object-contain relative z-10 drop-shadow-2xl"
            />
          </motion.div>

          {/* School name */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <p className="text-white font-bold text-xl tracking-wide">Al Fakhir School</p>
            <p className="text-[#1B8B87] text-sm mt-1 tracking-widest uppercase">Guru Dashboard</p>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            className="flex gap-1.5 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-[#1B8B87]"
                animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
