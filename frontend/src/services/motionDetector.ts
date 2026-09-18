import { useEffect, useRef } from 'react';

export function useShakeDetector(onShake: () => void, enabled: boolean = true) {
  const lastTimeRef = useRef<number>(Date.now());
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const lastZRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      return;
    }

    const SHAKE_THRESHOLD = 18; // Acceleration change threshold

    const handleMotion = (event: DeviceMotionEvent) => {
      const current = event.accelerationIncludingGravity;
      if (!current || current.x === null || current.y === null || current.z === null) return;

      const currentTime = Date.now();
      if (currentTime - lastTimeRef.current > 100) {
        const timeDiff = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;

        if (lastXRef.current !== null && lastYRef.current !== null && lastZRef.current !== null) {
          const deltaX = Math.abs(current.x - lastXRef.current);
          const deltaY = Math.abs(current.y - lastYRef.current);
          const deltaZ = Math.abs(current.z - lastZRef.current);

          const speed = ((deltaX + deltaY + deltaZ) / timeDiff) * 10000;

          if (speed > SHAKE_THRESHOLD * 100) {
            console.log('[MotionDetector] Phone shake gesture detected!');
            onShake();
          }
        }

        lastXRef.current = current.x;
        lastYRef.current = current.y;
        lastZRef.current = current.z;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [onShake, enabled]);
}
