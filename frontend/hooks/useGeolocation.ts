import { useState, useEffect, useCallback, useRef } from 'react';

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported');
      return;
    }

    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
    setWatching(true);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { position, error, watching, startWatching, stopWatching };
}
