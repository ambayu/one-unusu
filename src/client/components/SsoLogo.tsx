import React, { useState } from 'react';
import { GraduationCap, ShieldCheck, KeyRound } from 'lucide-react';

interface SsoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showBadge?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  subtitle?: string;
  className?: string;
}

export const SsoLogo: React.FC<SsoLogoProps> = ({
  size = 'md',
  showBadge = true,
  interactive = true,
  onClick,
  subtitle,
  className = '',
}) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    if (!interactive) return;
    setClicked(true);
    setTimeout(() => setClicked(false), 800);
    if (onClick) onClick();
  };

  const sizeClasses = {
    sm: {
      wrapper: 'h-10 w-10',
      icon: 'w-5 h-5',
      title: 'text-base',
      sub: 'text-[9px]',
      badge: 'text-[9px] px-1.5 py-0.5',
    },
    md: {
      wrapper: 'h-12 w-12',
      icon: 'w-6 h-6',
      title: 'text-xl',
      sub: 'text-[10px]',
      badge: 'text-[10px] px-2 py-0.5',
    },
    lg: {
      wrapper: 'h-16 w-16',
      icon: 'w-8 h-8',
      title: 'text-2xl',
      sub: 'text-xs',
      badge: 'text-xs px-2.5 py-1',
    },
    hero: {
      wrapper: 'h-24 w-24',
      icon: 'w-12 h-12',
      title: 'text-4xl',
      sub: 'text-sm',
      badge: 'text-xs px-3 py-1',
    },
  }[size];

  return (
    <div
      onClick={handleClick}
      className={`inline-flex items-center space-x-3.5 select-none transition-all duration-300 ${
        interactive ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      {/* Emblem Icon dengan Layering Animasi Glow, Pulse, dan Ripple */}
      <div className="relative">
        {/* Glow Halo di belakang logo */}
        <div className="absolute -inset-1.5 bg-gradient-to-tr from-emerald-600 to-amber-400 rounded-3xl blur-md opacity-40 group-hover:opacity-80 transition duration-500 group-hover:scale-110" />

        {/* Lingkaran Ripple Berputar Halus saat Hover */}
        <div className="absolute -inset-1 border border-emerald-400/40 rounded-2xl animate-[spin_10s_linear_infinite] opacity-60 pointer-events-none" />

        {/* Container Icon Utama */}
        <div
          className={`${sizeClasses.wrapper} relative rounded-2xl bg-gradient-to-tr from-emerald-950 via-emerald-800 to-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-950/40 border border-emerald-400/40 transition-all duration-300 group-hover:shadow-emerald-600/50 group-hover:scale-105 ${
            clicked ? 'scale-90 rotate-12 transition-transform duration-150 ring-4 ring-amber-400' : ''
          }`}
        >
          {/* Efek Kilau / Shimmer Diagonal di dalam kotak */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          </div>

          {/* Topi Toga UNUSU / Icon Utama */}
          <GraduationCap
            className={`${sizeClasses.icon} text-amber-300 drop-shadow-md transition-all duration-300 group-hover:rotate-6 group-hover:scale-110`}
          />

          {/* Mini Key Shield di pojok bawah kanan */}
          <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow-md border border-emerald-950">
            <ShieldCheck className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Teks Brand Identity */}
      <div className="flex flex-col text-left">
        <div className="flex items-center space-x-2">
          <span className={`font-black tracking-tight text-slate-900 group-hover:text-emerald-950 transition ${sizeClasses.title}`}>
            ONE
          </span>
          <span className={`font-black tracking-tight text-emerald-700 group-hover:text-emerald-600 transition ${sizeClasses.title}`}>
            UNUSU
          </span>

          {showBadge && (
            <span
              className={`inline-flex items-center space-x-1 font-extrabold rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-900/20 uppercase tracking-widest transition-transform group-hover:scale-105 ${sizeClasses.badge}`}
            >
              <KeyRound className="w-2.5 h-2.5 text-amber-300" />
              <span>SSO</span>
            </span>
          )}
        </div>

        <p className={`font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-700 transition ${sizeClasses.sub}`}>
          {subtitle || 'Single Sign-On Central Gateway'}
        </p>
      </div>
    </div>
  );
};
