import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export function useUserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    const getLocation = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await Geolocation.requestPermissions();
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 10000,
          });
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        } catch (e) {
          // silently fail
        }
      } else {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
          () => {},
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      }
    };
    getLocation();
  }, []);

  return position;
}