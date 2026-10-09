import { useEffect, useState } from "react";
import * as Location from "expo-location";

export function useRiderLocation(enabled = true) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setDenied(true);
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 10000 },
        (loc) => setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
      );
      if (cancelled) sub.remove();
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { coords, denied };
}