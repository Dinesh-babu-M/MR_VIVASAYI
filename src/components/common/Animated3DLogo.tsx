import React, { useState, useRef } from 'react';
import { Sparkles, Shield, Leaf, Lock, Zap } from 'lucide-react';

interface Animated3DLogoProps {
  mode?: 'public' | 'admin';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Animated3DLogo: React.FC<Animated3DLogoProps> = ({
  mode = 'public',
  className = '',
  size = 'md',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, isHovered: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -16; // Max 16 deg tilt
    const rotateY = ((x - centerX) / centerX) * 16;

    setTilt({ x: rotateX, y: rotateY, isHovered: true });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, isHovered: false });
  };

  const isPublic = mode === 'public';

  // Responsive mobile-friendly size classes
  const sizeClasses = {
    sm: 'w-44 h-44 sm:w-52 sm:h-52',
    md: 'w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64',
    lg: 'w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72',
  }[size];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center justify-center select-none perspective-1000 ${sizeClasses} ${className}`}
    >
      {/* 1. Ambient Ground Shadow with soft 3D depth */}
      <div 
        className="absolute bottom-2 w-3/4 h-5 bg-emerald-900/10 rounded-[100%] blur-md animate-pulse-shadow pointer-events-none" 
      />

      {/* 2. Outer Ambient Radial Aura Glow (Soft Light Theme) */}
      <div
        className={`absolute inset-2 rounded-full blur-xl animate-glow-pulse pointer-events-none ${
          isPublic
            ? 'bg-gradient-to-tr from-emerald-400/20 via-amber-300/15 to-teal-300/20'
            : 'bg-gradient-to-tr from-amber-400/25 via-emerald-400/15 to-amber-300/20'
        }`}
      />

      {/* 3. 3D Rotating Gyroscopic Orbit Rings */}
      <div className="absolute inset-1 flex items-center justify-center pointer-events-none preserve-3d">
        <div
          className={`w-full h-full rounded-full border-2 border-dashed animate-orbit3d ${
            isPublic ? 'border-emerald-500/25' : 'border-amber-500/30'
          }`}
        />
        <div
          className={`w-4/5 h-4/5 rounded-full border border-dotted animate-float3d-reverse ${
            isPublic ? 'border-amber-400/30' : 'border-emerald-400/30'
          }`}
        />
      </div>

      {/* 4. Interactive 3D Card / Plinth (Light Theme) */}
      <div
        style={{
          transform: tilt.isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(16px)`
            : undefined,
          transition: tilt.isHovered ? 'transform 0.1s ease-out' : 'transform 0.8s ease-in-out',
        }}
        className={`relative z-10 w-full h-full flex flex-col items-center justify-center preserve-3d ${
          !tilt.isHovered ? 'animate-float3d' : ''
        }`}
      >
        {/* Layer A: 3D Beveled Glass Plinth in Light Theme */}
        <div
          style={{ transform: 'translateZ(14px)' }}
          className={`relative p-3.5 sm:p-5 rounded-3xl backdrop-blur-md border shadow-xl transition-all duration-300 ${
            isPublic
              ? 'bg-gradient-to-br from-white via-emerald-50/80 to-amber-50/60 border-emerald-200/90 shadow-emerald-900/10'
              : 'bg-gradient-to-br from-white via-amber-50/80 to-emerald-50/70 border-amber-300/90 shadow-amber-900/10'
          }`}
        >
          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/50 to-transparent rotate-45 animate-[shimmer_3.5s_infinite]" />
          </div>

          {/* Layer B: Center Brand Emblem */}
          <div
            style={{ transform: 'translateZ(30px)' }}
            className="relative flex flex-col items-center justify-center p-2 rounded-2xl"
          >
            <div className="relative">
              <div
                className={`absolute -inset-2 rounded-full blur-sm opacity-60 ${
                  isPublic ? 'bg-emerald-300/40' : 'bg-amber-300/50'
                }`}
              />

              <img
                src="/mr-vivasayi-logo.png"
                alt="MR. VIVASAYI"
                className="relative w-20 h-20 sm:w-28 sm:h-28 object-contain filter drop-shadow-md"
              />
            </div>

            {/* Brand Wordmark & Mode Pill */}
            <div className="mt-2 text-center">
              <span
                className={`text-[10px] sm:text-xs font-black tracking-wider uppercase font-mono px-2.5 py-0.5 rounded-full border shadow-2xs ${
                  isPublic
                    ? 'bg-emerald-700 text-white border-emerald-600'
                    : 'bg-amber-500 text-emerald-950 font-black border-amber-400'
                }`}
              >
                {isPublic ? '🌿 MR. VIVASAYI' : '🛡️ ADMIN GUARD'}
              </span>
            </div>
          </div>
        </div>

        {/* Layer C: Floating 3D Isometric "4" "0" "4" Block Badges */}
        {/* Left '4' Floating 3D Badge */}
        <div
          style={{ transform: 'translateZ(45px)' }}
          className="absolute left-0 sm:-left-2 top-4 sm:top-6 animate-floatSlow"
        >
          <div
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-mono font-black text-base sm:text-lg shadow-lg border backdrop-blur-sm ${
              isPublic
                ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-300 shadow-emerald-900/20'
                : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-200 shadow-amber-900/20'
            }`}
          >
            4
          </div>
        </div>

        {/* Center Top Floating 3D Emblem */}
        <div
          style={{ transform: 'translateZ(55px)' }}
          className="absolute -top-3 sm:-top-4 animate-bounce-gentle"
        >
          <div
            className={`px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-md border text-[10px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-sm ${
              isPublic
                ? 'bg-amber-400 text-emerald-950 border-amber-300'
                : 'bg-rose-600 text-white border-rose-400'
            }`}
          >
            {isPublic ? (
              <>
                <Leaf className="w-3 h-3 text-emerald-950" />
                <span>404 NOT FOUND</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-white" />
                <span>ADMIN 404</span>
              </>
            )}
          </div>
        </div>

        {/* Right '4' Floating 3D Badge */}
        <div
          style={{ transform: 'translateZ(45px)' }}
          className="absolute right-0 sm:-right-2 bottom-6 sm:bottom-8 animate-float3d-reverse"
        >
          <div
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-mono font-black text-base sm:text-lg shadow-lg border backdrop-blur-sm ${
              isPublic
                ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-300 shadow-emerald-900/20'
                : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-200 shadow-amber-900/20'
            }`}
          >
            4
          </div>
        </div>
      </div>
    </div>
  );
};

export default Animated3DLogo;
