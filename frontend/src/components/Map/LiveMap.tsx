import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Incident, RouteOption, GeocodedLocation } from '../../types';
import { searchLocationNominatim } from '../../services/geolocation';
import { Search, Navigation, AlertTriangle, ShieldAlert, Crosshair } from 'lucide-react';

interface LiveMapProps {
  userLocation: { lat: number; lng: number; accuracy: number } | null;
  incidents: Incident[];
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  onSetDestination: (location: GeocodedLocation) => void;
  isNightMode: boolean;
  onSelectLocationOnMap?: (lat: number, lng: number) => void;
  isSelectingMapPin?: boolean;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  userLocation,
  incidents,
  routes,
  selectedRouteId,
  onSelectRoute,
  onSetDestination,
  isNightMode,
  onSelectLocationOnMap,
  isSelectingMapPin
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const hotspotMarkersRef = useRef<L.CircleMarker[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultLat = userLocation ? userLocation.lat : 28.6315; // Delhi default
    const defaultLng = userLocation ? userLocation.lng : 77.2167;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 14,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Map click listener for placing incident pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onSelectLocationOnMap) {
        onSelectLocationOnMap(e.latlng.lat, e.latlng.lng);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map theme on Day/Night toggle
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (isNightMode) {
      mapContainerRef.current.classList.add('dark-tiles');
    } else {
      mapContainerRef.current.classList.remove('dark-tiles');
    }
  }, [isNightMode]);

  // Update user location marker & accuracy circle
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    const latLng: [number, number] = [userLocation.lat, userLocation.lng];

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: 'custom-user-pin',
        html: `<div class="relative w-6 h-6 flex items-center justify-center">
                <div class="absolute w-6 h-6 rounded-full bg-rose-500/40 animate-ping"></div>
                <div class="w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-md"></div>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      userMarkerRef.current = L.marker(latLng, { icon: userIcon }).addTo(mapRef.current);
      userAccuracyCircleRef.current = L.circle(latLng, {
        radius: userLocation.accuracy || 30,
        color: '#f43f5e',
        fillColor: '#f43f5e',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(mapRef.current);

      mapRef.current.setView(latLng, 15);
    } else {
      userMarkerRef.current.setLatLng(latLng);
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.setLatLng(latLng);
        userAccuracyCircleRef.current.setRadius(userLocation.accuracy || 30);
      }
    }
  }, [userLocation]);

  // Render Crime Heat Density Layer (Custom Radial Heatmap Layer)
  useEffect(() => {
    if (!mapRef.current) return;

    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (incidents.length > 0) {
      const heatGroup = L.layerGroup();

      incidents.forEach(inc => {
        const severity = inc.severity || 3;
        const radiusMeters = severity >= 4 ? 350 : severity >= 3 ? 250 : 180;
        
        // Severity-based glowing gradient colors
        const color = severity >= 5 ? '#991b1b' : severity >= 4 ? '#ef4444' : severity >= 3 ? '#f59e0b' : '#3b82f6';
        const opacity = Math.min(0.55, 0.2 + severity * 0.08);

        const circle = L.circle([inc.lat, inc.lng], {
          radius: radiusMeters,
          fillColor: color,
          color: color,
          weight: 1,
          opacity: opacity * 0.7,
          fillOpacity: opacity
        });

        circle.bindPopup(`
          <div class="p-1 font-sans text-slate-900">
            <div class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-0.5">
              ⚠️ ${inc.type}
            </div>
            <div class="text-xs font-semibold">${inc.description || 'Reported Incident'}</div>
            <div class="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Severity: ${inc.severity}/5</span>
              <span class="capitalize">Source: ${inc.source}</span>
            </div>
          </div>
        `);

        heatGroup.addLayer(circle);
      });

      heatGroup.addTo(mapRef.current);
      heatLayerRef.current = heatGroup;
    }
  }, [incidents]);

  // Render Safest Routes & Alternatives
  useEffect(() => {
    if (!mapRef.current) return;

    routeLayersRef.current.forEach(layer => mapRef.current?.removeLayer(layer));
    routeLayersRef.current = [];

    hotspotMarkersRef.current.forEach(m => mapRef.current?.removeLayer(m));
    hotspotMarkersRef.current = [];

    if (routes.length === 0) return;

    routes.forEach(route => {
      const isSelected = selectedRouteId === route.id;
      const polyline = L.polyline(route.coordinates, {
        color: route.color,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.45,
        dashArray: isSelected ? undefined : '6, 8'
      }).addTo(mapRef.current!);

      polyline.on('click', () => onSelectRoute(route.id));
      routeLayersRef.current.push(polyline);

      if (isSelected) {
        route.dangerHotspots.forEach(spot => {
          const hotspotMarker = L.circleMarker([spot.lat, spot.lng], {
            radius: 7,
            fillColor: '#ef4444',
            color: '#ffffff',
            weight: 1.5,
            fillOpacity: 0.9
          }).addTo(mapRef.current!);

          hotspotMarker.bindPopup(`
            <div class="p-1 text-slate-900 font-sans">
              <strong class="text-xs text-rose-600 flex items-center gap-1">⚠️ Hazard Zone</strong>
              <div class="text-xs font-semibold mt-0.5">${spot.type}</div>
              <div class="text-[10px] text-slate-600">Severity Level: ${spot.severity}/5</div>
            </div>
          `);

          hotspotMarkersRef.current.push(hotspotMarker);
        });
      }
    });

    const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];
    if (selectedRoute && selectedRoute.coordinates.length > 0) {
      const bounds = L.latLngBounds(selectedRoute.coordinates);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, selectedRouteId]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchLocationNominatim(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectSearchResult = (loc: GeocodedLocation) => {
    setSearchResults([]);
    setSearchQuery(loc.displayName.split(',')[0]);
    onSetDestination(loc);
    if (mapRef.current) {
      mapRef.current.setView([loc.lat, loc.lng], 16);
    }
  };

  const handleRecenter = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 16);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-60px)]">
      {/* Search Header Overlay */}
      <div className="absolute top-16 left-3 right-3 z-30">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination (e.g. Connaught Place, Station)..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl glass-panel text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xl border border-slate-700/80"
            />
            <Search className="absolute left-3 w-5 h-5 text-slate-400" />
            {isSearching ? (
              <div className="absolute right-3 w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            ) : null}
          </div>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-2 rounded-2xl glass-panel border border-slate-700 shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSearchResult(result)}
                className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800/80 border-b border-slate-800/50 last:border-0 flex items-start gap-2"
              >
                <Navigation className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{result.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isSelectingMapPin && (
        <div className="absolute top-28 left-4 right-4 z-30 glass-panel bg-rose-950/90 border border-rose-500/50 p-2.5 rounded-xl text-center shadow-2xl">
          <p className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
            <Crosshair className="w-4 h-4 text-rose-400 animate-spin" />
            Tap anywhere on the map to place incident pin
          </p>
        </div>
      )}

      <button
        onClick={handleRecenter}
        className="absolute bottom-24 right-4 z-30 p-3 rounded-2xl glass-panel border border-slate-700 text-rose-400 shadow-2xl active:scale-95 transition-all hover:bg-slate-800"
        title="Recenter Map to My GPS"
      >
        <Navigation className="w-5 h-5 fill-rose-500/20" />
      </button>

      <div ref={mapContainerRef} className="w-full h-full min-h-[calc(100vh-60px)]" />
    </div>
  );
};
