import React, { useState, useEffect } from 'react';
import { Header } from './components/Layout/Header';
import { BottomNav, TabType } from './components/Layout/BottomNav';
import { LiveMap } from './components/Map/LiveMap';
import { SOSButton } from './components/SOS/SOSButton';
import { RouteCard } from './components/RoutePlanner/RouteCard';
import { ReportModal } from './components/ReportForm/ReportModal';
import { SettingsModal } from './components/Settings/SettingsModal';

import { Incident, RouteOption, UserSettings, GeocodedLocation } from './types';
import { watchUserLocation } from './services/geolocation';
import { fetchIncidents, fetchSafestRoutes } from './services/api';
import { useShakeDetector } from './services/motionDetector';

const DEFAULT_SETTINGS: UserSettings = {
  emergencyContacts: [
    { id: '1', name: 'Primary Guardian / Family', phone: '+91 98765 43210' }
  ],
  primaryHelpline: '112',
  womenHelpline: '1091',
  distressHelpline: '181',
  alarmVolume: 1.0,
  sirenPin: '1234',
  enableShakeSOS: true,
  enableWakeLock: true
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isNightMode, setIsNightMode] = useState(true);

  // Incidents & Heatmap Data
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Route Planning State
  const [destination, setDestination] = useState<GeocodedLocation | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeDisclaimer, setRouteDisclaimer] = useState('');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  // SOS Emergency State
  const [isSOSTriggered, setIsSOSTriggered] = useState(false);

  // Map Pin Picker Mode for Complaint Form
  const [isSelectingMapPin, setIsSelectingMapPin] = useState(false);
  const [selectedMapPin, setSelectedMapPin] = useState<{ lat: number; lng: number } | null>(null);

  // Settings State (persisted in localStorage)
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('safewalk_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Save settings on update
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('safewalk_settings', JSON.stringify(newSettings));
  };

  // Monitor network online / offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize GPS Geolocation Watcher
  useEffect(() => {
    const watchId = watchUserLocation(
      (coords) => {
        setUserLocation(coords);
        setGpsActive(true);
      },
      (err) => {
        console.warn('GPS location tracking error:', err.message);
        setGpsActive(false);
        // Fallback default center if location permission denied or timeout
        if (!userLocation) {
          setUserLocation({ lat: 28.6315, lng: 77.2167, accuracy: 50 });
        }
      }
    );

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Load Incidents from Backend
  useEffect(() => {
    let isMounted = true;
    const loadIncidentsData = async () => {
      const timeOfDayFilter = isNightMode ? 'night' : 'day';
      const fetched = await fetchIncidents({ timeOfDay: timeOfDayFilter });
      if (isMounted) {
        setIncidents(fetched);
      }
    };

    loadIncidentsData();
    const interval = setInterval(loadIncidentsData, 60000); // Poll updates every 60 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isNightMode]);

  // Handle Destination Change -> Calculate Safest Routes
  const handleSetDestination = async (loc: GeocodedLocation) => {
    setDestination(loc);
    if (!userLocation) return;

    setIsLoadingRoutes(true);
    try {
      const res = await fetchSafestRoutes(
        userLocation.lat,
        userLocation.lng,
        loc.lat,
        loc.lng,
        isNightMode ? 'night' : 'day'
      );

      setRoutes(res.routes);
      setRouteDisclaimer(res.disclaimer);
      if (res.routes.length > 0) {
        setSelectedRouteId(res.routes[0].id);
      }
    } catch (err) {
      console.warn('Failed to calculate routes:', err);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  // Shake Detection SOS Trigger
  useShakeDetector(() => {
    if (settings.enableShakeSOS && !isSOSTriggered) {
      setIsSOSTriggered(true);
      setActiveTab('sos');
    }
  }, settings.enableShakeSOS);

  // Map Click Listener when picking complaint location pin
  const handleSelectLocationOnMap = (lat: number, lng: number) => {
    if (isSelectingMapPin) {
      setSelectedMapPin({ lat, lng });
      setIsSelectingMapPin(false);
      setActiveTab('report');
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Navigation Header */}
      <Header
        isNightMode={isNightMode}
        onToggleNightMode={() => setIsNightMode(!isNightMode)}
        isOnline={isOnline}
        gpsActive={gpsActive}
      />

      {/* Main Tab Content View */}
      <main className="flex-1 pt-14 pb-16">
        {activeTab === 'map' && (
          <div className="relative w-full h-[calc(100vh-120px)]">
            <LiveMap
              userLocation={userLocation}
              incidents={incidents}
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              onSetDestination={handleSetDestination}
              isNightMode={isNightMode}
              onSelectLocationOnMap={handleSelectLocationOnMap}
              isSelectingMapPin={isSelectingMapPin}
            />

            {/* Route Planning Cards overlay */}
            <RouteCard
              destination={destination}
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              disclaimer={routeDisclaimer}
              isLoading={isLoadingRoutes}
            />
          </div>
        )}

        {activeTab === 'sos' && (
          <SOSButton
            userLocation={userLocation}
            settings={settings}
            isTriggered={isSOSTriggered}
            onTriggerSOS={() => setIsSOSTriggered(true)}
            onDismissSOS={() => setIsSOSTriggered(false)}
          />
        )}

        {activeTab === 'report' && (
          <ReportModal
            userLocation={userLocation}
            onOpenPinPicker={() => {
              setIsSelectingMapPin(true);
              setActiveTab('map');
            }}
            selectedMapPin={selectedMapPin}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* Bottom Mobile Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setIsSelectingMapPin(false);
          setActiveTab(tab);
        }}
      />
    </div>
  );
};
