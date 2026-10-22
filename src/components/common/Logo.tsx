import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'wordmark';
  theme?: 'light' | 'dark' | 'auto';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

const sizes = {
  xs: { iconSize: 'h-7 w-auto', text: 'text-xs font-black', tagline: 'text-[8px]' },
  sm: { iconSize: 'h-9 w-auto', text: 'text-sm font-black', tagline: 'text-[9px]' },
  md: { iconSize: 'h-11 w-auto', text: 'text-base font-black', tagline: 'text-[10px]' },
  lg: { iconSize: 'h-14 w-auto', text: 'text-xl font-black', tagline: 'text-xs' },
  xl: { iconSize: 'h-20 w-auto', text: 'text-3xl font-black', tagline: 'text-sm' },
};

export default function Logo({
  variant = 'full',
  theme = 'auto',
  size = 'md',
  className,
  showTagline = false,
}: LogoProps) {
  const s = sizes[size];
  const isDark = theme === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#0F2E25';
  const taglineColor = isDark ? '#FCD34D' : '#059669';

  if (variant === 'icon') {
    return (
      <div className={cn('flex-shrink-0 flex items-center justify-center', className)}>
        <img
          src="/mr-vivasayi-logo.png"
          alt="MR. VIVASAYI Logo"
          className={cn(s.iconSize, 'object-contain filter drop-shadow-md transition-transform hover:scale-105')}
        />
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={cn('flex flex-col justify-center', className)}>
        <span
          className={cn(s.text, 'font-black tracking-wider uppercase leading-tight font-serif')}
          style={{ color: textColor }}
        >
          MR. VIVASAYI
        </span>
        {showTagline && (
          <span
            className={cn(s.tagline, 'tracking-widest uppercase font-bold mt-0.5')}
            style={{ color: taglineColor }}
          >
            ORGANIC & NATURAL FOODS
          </span>
        )}
      </div>
    );
  }

  // Full logo with Image Emblem + Crisp Typography
  return (
    <div className={cn('flex items-center gap-2.5 flex-shrink-0', className)}>
      <img
        src="/mr-vivasayi-logo.png"
        alt="MR. VIVASAYI"
        className={cn(s.iconSize, 'object-contain filter drop-shadow-sm transition-transform hover:scale-105')}
      />
      <div className="flex flex-col justify-center">
        <span
          className={cn(s.text, 'font-black tracking-wider uppercase leading-none font-serif')}
          style={{ color: textColor, letterSpacing: '0.04em' }}
        >
          MR. VIVASAYI
        </span>
        {showTagline && (
          <span
            className={cn(s.tagline, 'tracking-wider uppercase font-bold mt-0.5 leading-tight')}
            style={{ color: taglineColor }}
          >
            Organic & Natural Foods
          </span>
        )}
      </div>
    </div>
  );
}

export function LogoIcon({ size = 'md', theme = 'auto', className }: Pick<LogoProps, 'size' | 'theme' | 'className'>) {
  return <Logo variant="icon" size={size} theme={theme} className={className} />;
}

export function LogoFull({ size = 'md', theme = 'auto', showTagline = true, className }: LogoProps) {
  return <Logo variant="full" size={size} theme={theme} showTagline={showTagline} className={className} />;
}
