'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function TypingIndicator({ user }) {
  const [dots, setDots] = useState('.');
  
  // Animate the dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '.';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!user) return null;
  
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 my-1 ml-2">
      <div className="flex items-center gap-1.5">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name}
            width={18}
            height={18}
            className="rounded-full"
          />
        ) : (
          <div className="h-[18px] w-[18px] rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
        <span className="text-xs font-medium">{user.name}</span>
      </div>
      <div className="flex items-center">
        <span>typing</span>
        <span className="min-w-[15px] inline-block">{dots}</span>
      </div>
    </div>
  );
} 
