import { useState, useCallback } from "react";
import type { CircuitWithStops } from "@/hooks/useCircuits";

interface PreloadProgress {
  percent: number;
  label: string;
}

/**
 * Pre-downloads all circuit assets (audio, music previews, route data)
 * so the navigation works offline in areas with poor connectivity.
 */
export function useCircuitPreload() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<PreloadProgress>({ percent: 0, label: "" });
  const [done, setDone] = useState(false);

  const preload = useCallback(async (circuit: CircuitWithStops) => {
    setLoading(true);
    setDone(false);

    // Collect all URLs to prefetch
    const urls: { url: string; label: string }[] = [];

    // Audio zone files
    circuit.audio_zones.forEach((z) => {
      if (z.audio_url) urls.push({ url: z.audio_url, label: "Audio" });
    });

    // Music preview files
    circuit.music_segments.forEach((m) => {
      if (m.preview_url) urls.push({ url: m.preview_url, label: "Musique" });
      if (m.artwork_url) urls.push({ url: m.artwork_url, label: "Pochette" });
    });

    // Circuit image
    if (circuit.image) urls.push({ url: circuit.image, label: "Image" });

    // Stop photos
    circuit.stops.forEach((s) => {
      if (s.photo_url) urls.push({ url: s.photo_url, label: "Photo" });
    });

    // Pre-cache map tiles covering the full bounding box of the route so the
    // map keeps working offline across the entire circuit.
    const routeCoords = circuit.route;
    if (routeCoords.length > 0) {
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      for (const [lat, lng] of routeCoords) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
      // ~500m padding around the route
      const padLat = 0.005;
      const padLng = 0.005 / Math.max(0.2, Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
      minLat -= padLat; maxLat += padLat;
      minLng -= padLng; maxLng += padLng;

      const lat2tile = (lat: number, z: number) => {
        const latRad = (lat * Math.PI) / 180;
        return Math.floor(
          ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z)
        );
      };
      const lng2tile = (lng: number, z: number) =>
        Math.floor(((lng + 180) / 360) * Math.pow(2, z));

      const zoomLevels = [13, 14, 15, 16, 17];
      const MAX_TILES_PER_ZOOM = 400; // safety cap per zoom level
      let tileIndex = 0;

      for (const z of zoomLevels) {
        const xMin = lng2tile(minLng, z);
        const xMax = lng2tile(maxLng, z);
        const yMin = lat2tile(maxLat, z);
        const yMax = lat2tile(minLat, z);
        const count = (xMax - xMin + 1) * (yMax - yMin + 1);
        if (count > MAX_TILES_PER_ZOOM) continue;
        for (let x = xMin; x <= xMax; x++) {
          for (let y = yMin; y <= yMax; y++) {
            const sub = ["a", "b", "c"][tileIndex % 3];
            tileIndex++;
            // Esri World Street Map (primary tiles used by NavigationMap)
            urls.push({
              url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
              label: "Carte",
            });
            // OSM fallback tiles
            urls.push({
              url: `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
              label: "Carte",
            });
          }
        }
      }
    }

    const total = urls.length;
    if (total === 0) {
      setProgress({ percent: 100, label: "Prêt !" });
      setLoading(false);
      setDone(true);
      return;
    }

    let loaded = 0;

    // Download in batches of 6 for parallelism
    const batchSize = 6;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const currentLabel = batch[0]?.label || "Données";
      setProgress({
        percent: Math.round((loaded / total) * 100),
        label: `${currentLabel}… (${loaded}/${total})`,
      });

      await Promise.allSettled(
        batch.map(({ url }) =>
          fetch(url, { mode: "no-cors", cache: "force-cache" }).catch(() => {})
        )
      );

      loaded += batch.length;
    }

    setProgress({ percent: 100, label: "Prêt !" });
    setLoading(false);
    setDone(true);
  }, []);

  return { preload, loading, progress, done };
}
