'use client';

import { useEffect, useRef } from 'react';

export default function InteractiveBackground({ children }) {
  const containerRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Calculate mouse position as percentage
      const xPercent = (clientX / innerWidth - 0.5) * 2;
      const yPercent = (clientY / innerHeight - 0.5) * 2;

      // Apply parallax effect to different layers
      layersRef.current.forEach((layer, index) => {
        if (layer) {
          const depth = (index + 1) * 10;
          const moveX = xPercent * depth;
          const moveY = yPercent * depth;
          layer.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Animated 3D Pattern Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 dark:from-indigo-950/50 dark:via-slate-900 dark:to-purple-950/50">
        
        {/* Floating orbs with parallax */}
        <div className="absolute inset-0 opacity-40 dark:opacity-30">
          <div 
            ref={el => layersRef.current[0] = el}
            className="absolute top-0 left-0 w-96 h-96 bg-indigo-400/40 dark:bg-indigo-500/20 rounded-full blur-3xl transition-transform duration-300 ease-out"
          ></div>
          <div 
            ref={el => layersRef.current[1] = el}
            className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/40 dark:bg-purple-500/20 rounded-full blur-3xl transition-transform duration-500 ease-out"
          ></div>
          <div 
            ref={el => layersRef.current[2] = el}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/30 dark:bg-blue-500/10 rounded-full blur-3xl transition-transform duration-700 ease-out"
          ></div>
        </div>
        
        {/* Grid overlay with perspective */}
        <div 
          ref={el => layersRef.current[3] = el}
          className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.12)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(99,102,241,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] transition-transform duration-200 ease-out"
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
