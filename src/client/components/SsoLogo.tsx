import React, { useState } from 'react';
import {
  AcademicCapIcon,
  ShieldCheckIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

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
      {/* Emblem Icon dengan Desain Solid Elegan & Rapi */}
      <div className="relative">
        {/* Container Icon Utama */}
        <div
          className={`${sizeClasses.wrapper} relative rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-md border border-emerald-600/40 transition-all duration-200 group-hover:bg-emerald-700 ${
            clicked ? 'scale-95' : ''
          }`}
        >
          {/* Topi Toga UNUSU / Icon Utama */}
          <AcademicCapIcon
            className={`${sizeClasses.icon} text-amber-300 transition-transform duration-200 group-hover:scale-105`}
          />

          {/* Mini Key Shield di pojok bawah kanan */}
          <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow-xs border border-emerald-950">
            <ShieldCheckIcon className="w-3 h-3 text-emerald-950" />
          </div>
        </div>
      </div>

      {/* Teks Brand Identity */}
      <div className="flex flex-col text-left">
        <div className="flex items-center space-x-2">
          <span className={`font-black tracking-tight text-white ${sizeClasses.title}`}>
            ONE
          </span>
          <span className={`font-black tracking-tight text-emerald-400 ${sizeClasses.title}`}>
            UNUSU
          </span>

          {showBadge && (
            <span
              className={`inline-flex items-center space-x-1 font-bold rounded-md bg-emerald-800/80 text-emerald-200 border border-emerald-600/50 uppercase tracking-wider ${sizeClasses.badge}`}
            >
              <KeyIcon className="w-2.5 h-2.5 text-amber-300" />
              <span>SSO</span>
            </span>
          )}
        </div>

        <p className={`font-medium text-slate-400 tracking-normal ${sizeClasses.sub}`}>
          {subtitle || 'Single Sign-On Central Gateway'}
        </p>
      </div>
    </div>
  );
};
