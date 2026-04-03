'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const TOTAL = 5;

export default function NotFound() {
  const [countdown, setCountdown] = useState(TOTAL);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const circumference = 2 * Math.PI * 20;
  const progress = circumference * (countdown / TOTAL);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/6 rounded-full blur-3xl pointer-events-none" />

      {/* 404 */}
      <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-1 leading-none">
        404
      </h1>
      <p className="text-base font-semibold text-white mb-0.5">Page Not Found</p>
      <p className="text-xs text-gray-500 mb-6">This endpoint doesn&apos;t exist on our server.</p>

      {/* GIF */}
      <div className="rounded-2xl overflow-hidden border border-gray-700/40 mb-6 shadow-2xl shadow-black/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://media1.giphy.com/media/dtBi0s3hndz7q/giphy.gif"
          alt="404 not found"
          width={280}
          className="block"
        />
      </div>

      {/* Countdown ring */}
      <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm border border-gray-700/40 rounded-full px-5 py-2.5 mb-4">
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 50 50">
            {/* Track */}
            <circle cx="25" cy="25" r="20" fill="none" stroke="#1f2937" strokeWidth="3.5" />
            {/* Progress */}
            <circle
              cx="25" cy="25" r="20"
              fill="none"
              stroke="#6366f1"
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            {countdown}
          </span>
        </div>
        <span className="text-sm text-gray-300">
          Redirecting to home<span className="animate-pulse">…</span>
        </span>
      </div>

      <button
        onClick={() => router.push('/')}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
      >
        Go now →
      </button>
    </div>
  );
}

