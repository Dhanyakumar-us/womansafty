import React from 'react';
import { Shield, Moon, Sun, Signal, WifiOff } from 'lucide-react';

interface HeaderProps {
  isNightMode: boolean;
  onToggleNightMode: () => void;
  isOnline: boolean;
  gpsActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isNightMode,
  onToggleNightMode,
  isOnline,
  gpsActive
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 glass-panel border-b border-slate-800 flex items-center justify-between shadow-xl">
      <div className="flex items-center space-x-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50">
          <Shield className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            SafeWalk
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              PWA
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Women Safety & Navigation</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Network status */}
        <div className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
          isOnline
            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
            : 'bg-amber-950/60 text-amber-400 border-amber-800/50'
        }`}>
          {isOnline ? <Signal className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline SOS'}
        </div>

        {/* GPS Indicator */}
        <div className={`w-2.5 h-2.5 rounded-full ${gpsActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} title={gpsActive ? 'GPS Lock Active' : 'Acquiring GPS'} />

        {/* Day/Night Map Toggle */}
        <button
          onClick={onToggleNightMode}
          className={`p-2 rounded-xl transition-all border ${
            isNightMode
              ? 'bg-slate-800 text-amber-400 border-amber-500/30 shadow-inner'
              : 'bg-slate-900 text-slate-400 border-slate-700'
          }`}
          title={isNightMode ? 'Night Mode (Crime Filter ON)' : 'Day Mode'}
        >
          {isNightMode ? <Moon className="w-4 h-4 fill-amber-400/20" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
