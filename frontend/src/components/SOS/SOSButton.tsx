import React, { useState, useRef, useEffect } from 'react';
import { AlertOctagon, PhoneCall, Share2, VolumeX, ShieldAlert, KeyRound, CheckCircle2, Volume2, ShieldCheck, MapPin } from 'lucide-react';
import { UserSettings } from '../../types';
import { sirenService } from '../../services/audioSiren';

interface SOSButtonProps {
  userLocation: { lat: number; lng: number; accuracy: number } | null;
  settings: UserSettings;
  isTriggered: boolean;
  onTriggerSOS: () => void;
  onDismissSOS: () => void;
}

export const SOSButton: React.FC<SOSButtonProps> = ({
  userLocation,
  settings,
  isTriggered,
  onTriggerSOS,
  onDismissSOS
}) => {
  const [pressProgress, setPressProgress] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Handle Screen Wake Lock API
  useEffect(() => {
    if (isTriggered) {
      if ('wakeLock' in navigator && settings.enableWakeLock) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock;
          setWakeLockActive(true);
        }).catch((err: any) => {
          console.warn('[WakeLock] Could not acquire screen wake lock:', err);
        });
      }

      // Continuous vibration pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([1000, 300, 1000, 300, 1000]);
      }
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
        setWakeLockActive(false);
      }
    }
  }, [isTriggered, settings.enableWakeLock]);

  // Touch / Mouse Down handler for 2s long press
  const startPress = () => {
    if (isTriggered) return;
    setPressProgress(0);

    const startTime = Date.now();
    const DURATION = 2000; // 2 seconds

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setPressProgress(pct);

      if (pct >= 100) {
        clearInterval(progressIntervalRef.current!);
        triggerAlert();
      }
    }, 50);
  };

  const cancelPress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setPressProgress(0);
  };

  const triggerAlert = () => {
    onTriggerSOS();
    sirenService.startSiren(settings.alarmVolume);
  };

  const handleDeactivateRequest = () => {
    setShowPinModal(true);
    setEnteredPin('');
    setPinError(false);
  };

  const verifyPin = () => {
    if (enteredPin === settings.sirenPin || enteredPin === '1234') {
      sirenService.stopSiren();
      onDismissSOS();
      setShowPinModal(false);
      setEnteredPin('');
    } else {
      setPinError(true);
    }
  };

  // Build emergency SMS / Share text link
  const getEmergencyShareText = () => {
    const mapsUrl = userLocation
      ? `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`
      : 'Location unavailable';

    return `EMERGENCY ALERT: I am in distress! Please check on me immediately. My live location: ${mapsUrl}`;
  };

  const handleShareLocation = async () => {
    const text = getEmergencyShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SafeWalk Emergency SOS',
          text: text,
          url: userLocation ? `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}` : undefined
        });
      } catch (err) {
        console.warn('Web Share cancelled or failed:', err);
      }
    } else {
      // Fallback: create SMS link
      const contactPhones = settings.emergencyContacts.map(c => c.phone).join(',');
      const smsUrl = `sms:${contactPhones}?body=${encodeURIComponent(text)}`;
      window.location.href = smsUrl;
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-140px)] p-4 pb-20 max-w-md mx-auto">
      {/* Top Emergency Status Banner */}
      <div className="w-full text-center py-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          24/7 Personal Safety Mode
        </div>
        <h2 className="text-xl font-black text-white mt-2 tracking-tight">
          {isTriggered ? '🚨 EMERGENCY SOS ACTIVE' : 'EMERGENCY DISPATCH'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isTriggered
            ? 'Distress siren sounding & location broadcast enabled'
            : 'Press and hold button for 2 seconds to sound siren & send location'}
        </p>
      </div>

      {/* Center 2-Second Hold SOS Button */}
      <div className="relative my-8 flex items-center justify-center">
        {/* SVG Radial Circular Progress Ring */}
        <svg className="w-72 h-72 transform -rotate-90 pointer-events-none">
          <circle
            cx="144"
            cy="144"
            r="130"
            className="stroke-slate-800"
            strokeWidth="12"
            fill="transparent"
          />
          <circle
            cx="144"
            cy="144"
            r="130"
            className="stroke-rose-500 transition-all duration-75"
            strokeWidth="12"
            strokeDasharray={816}
            strokeDashoffset={816 - (816 * pressProgress) / 100}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* SOS Touch Button */}
        <button
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          className={`absolute w-56 h-56 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all transform active:scale-95 select-none cursor-pointer border-4 ${
            isTriggered
              ? 'bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 border-white text-white animate-sos-pulse'
              : pressProgress > 0
              ? 'bg-rose-700 border-rose-400 text-white scale-105'
              : 'bg-gradient-to-tr from-rose-600 to-red-600 border-rose-400/50 text-white shadow-rose-950/80 hover:brightness-110'
          }`}
        >
          <AlertOctagon className="w-20 h-20 mb-2 stroke-[2.5] drop-shadow-md" />
          <span className="text-2xl font-black tracking-wider uppercase drop-shadow-md">
            {isTriggered ? 'ACTIVE' : pressProgress > 0 ? 'HOLDING...' : 'HOLD SOS'}
          </span>
          <span className="text-[11px] font-semibold text-rose-100/80 mt-1">
            {isTriggered ? 'Tap Deactivate' : 'Hold 2 Sec'}
          </span>
        </button>
      </div>

      {/* Action Buttons Panel */}
      <div className="w-full space-y-3">
        {/* ONE-TAP HELPLINE CALL BUTTON */}
        <a
          href={`tel:${settings.primaryHelpline || '112'}`}
          className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-between shadow-xl transition-all border border-emerald-400/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-extrabold text-base leading-tight">Call Helpline ({settings.primaryHelpline || '112'})</div>
              <div className="text-[11px] text-emerald-100 font-medium">One-Tap Direct Dialing</div>
            </div>
          </div>
          <span className="text-xs font-black bg-white text-emerald-800 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Call Now
          </span>
        </a>

        {/* Alternate Helplines Row */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${settings.womenHelpline || '1091'}`}
            className="py-2.5 px-3 rounded-xl glass-panel text-xs text-center font-bold text-slate-200 border border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
            Women Helpline ({settings.womenHelpline || '1091'})
          </a>
          <a
            href={`tel:${settings.distressHelpline || '181'}`}
            className="py-2.5 px-3 rounded-xl glass-panel text-xs text-center font-bold text-slate-200 border border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
            Distress ({settings.distressHelpline || '181'})
          </a>
        </div>

        {/* Share Location SMS Button */}
        <button
          onClick={handleShareLocation}
          className="w-full py-3 px-4 rounded-xl glass-panel border border-slate-700 hover:bg-slate-800 active:scale-[0.98] text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <Share2 className="w-4 h-4 text-sky-400" />
          Broadcast Live Location to Emergency Contacts ({settings.emergencyContacts.length})
        </button>

        {/* Deactivate Siren button when active */}
        {isTriggered && (
          <button
            onClick={handleDeactivateRequest}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-2 shadow-xl"
          >
            <VolumeX className="w-5 h-5 text-rose-500" />
            Silence Siren (PIN Required)
          </button>
        )}
      </div>

      {/* PIN Lock Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xs glass-modal rounded-3xl p-6 border border-slate-700 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-white">Enter PIN to Silence</h3>
            <p className="text-xs text-slate-400 mt-1">Default PIN: 1234</p>

            <input
              type="password"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="••••"
              className="w-full mt-4 py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 text-center text-xl font-bold tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-bold mt-2">Incorrect PIN. Try 1234.</p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={() => setShowPinModal(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={verifyPin}
                className="py-2.5 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
