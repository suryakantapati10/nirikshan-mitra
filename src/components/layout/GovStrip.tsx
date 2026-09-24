import React from 'react';

export const GovStrip: React.FC = () => {
  return (
    <div className="bg-[#071421] text-[#94A3B8] text-xs py-1.5 px-4 sm:px-8 border-b border-[#1E293B]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-300">भारत सरकार &nbsp;|&nbsp; Government of India</span>
          <span className="text-slate-500" aria-hidden="true">&bull;</span>
          <span className="hidden sm:inline text-slate-400">Department of Consumer Affairs</span>
        </div>
        <div className="text-[11px] text-slate-400 hidden md:block">
          Legal Metrology (Packaged Commodities) Rules, 2011
        </div>
      </div>
    </div>
  );
};
