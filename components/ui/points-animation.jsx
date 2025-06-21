'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PointsAnimation({ points, onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (points) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onComplete) onComplete();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [points, onComplete]);

  if (!points) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ opacity: 1, scale: 1.5, y: -20 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 1.5 }}
        >
          <div className="text-3xl font-bold text-green-500 bg-black bg-opacity-20 px-4 py-2 rounded-lg shadow-lg">
            +{points} points!
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
