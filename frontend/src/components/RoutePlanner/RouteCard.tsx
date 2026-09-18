import React from 'react';
import { RouteOption, GeocodedLocation } from '../../types';
import { ShieldCheck, AlertTriangle, Navigation, Clock, ShieldAlert, Info } from 'lucide-react';

interface RouteCardProps {
  destination: GeocodedLocation | null;
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  disclaimer: string;
  isLoading: boolean;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  destination,
  routes,
  selectedRouteId,
  onSelectRoute,
  disclaimer,
  isLoading
}) => {
  if (!destination) return null;

  return (
    <div className="fixed bottom-16 left-3 right-3 z-30 max-w-md mx-auto">
      <div className="glass-panel rounded-3xl p-4 border border-slate-700/90 shadow-2xl space-y-3">
        {/* Header Destination Info */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4 text-rose-400" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destination</div>
              <div className="text-xs font-bold text-white truncate">{destination.displayName}</div>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              Scoring routes...
            </div>
          )}
        </div>

        {/* Route Alternatives Selection List */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;

            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-slate-500 ring-2 ring-rose-500/30 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: route.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white">{route.name}</span>
                      {route.isSafest && (
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          SAFEST
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {route.durationMin} mins
                      </span>
                      <span>•</span>
                      <span>{route.distanceKm} km</span>
                      {route.dangerHotspots.length > 0 && (
                        <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          {route.dangerHotspots.length} hazard{route.dangerHotspots.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Safety Score Badge */}
                <div className="text-right shrink-0">
                  <div
                    className="text-base font-black"
                    style={{ color: route.color }}
                  >
                    {route.safetyScore}%
                  </div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                    Safety Score
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Safety Disclaimer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[10px] text-slate-400 leading-tight">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>{disclaimer}</span>
        </div>
      </div>
    </div>
  );
};
