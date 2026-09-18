import React from 'react';
import { Map, AlertTriangle, FileText, Settings } from 'lucide-react';

export type TabType = 'map' | 'sos' | 'report' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'map', label: 'Map & Route', icon: Map },
    { id: 'sos', label: 'SOS Alert', icon: AlertTriangle, isAlert: true },
    { id: 'report', label: 'Report', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isAlert) {
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as TabType)}
              className="relative -top-5 flex flex-col items-center group"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white ring-4 ring-rose-500/40 animate-sos-pulse'
                  : 'bg-rose-600 text-white hover:bg-rose-500 ring-2 ring-rose-950 shadow-rose-950/60'
              }`}>
                <Icon className="w-7 h-7 stroke-[2.5]" />
              </div>
              <span className={`text-[11px] font-bold mt-1 tracking-tight ${isActive ? 'text-rose-400' : 'text-slate-400'}`}>
                SOS
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as TabType)}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-rose-400 font-bold bg-rose-500/10'
                : 'text-slate-400 font-medium hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
