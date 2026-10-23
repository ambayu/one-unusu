import React from 'react';

export const AppCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-xl bg-slate-200" />
        <div className="w-20 h-5 rounded-full bg-slate-200" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-5 bg-slate-200 rounded w-2/3" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-4/5" />
      </div>
      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
        <div className="h-4 bg-slate-200 rounded w-28" />
        <div className="w-8 h-8 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm animate-pulse space-y-6">
      <div className="flex items-center space-x-5">
        <div className="w-20 h-20 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-100 rounded w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
        <div className="h-14 bg-slate-100 rounded-xl" />
        <div className="h-14 bg-slate-100 rounded-xl" />
        <div className="h-14 bg-slate-100 rounded-xl" />
        <div className="h-14 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
};
