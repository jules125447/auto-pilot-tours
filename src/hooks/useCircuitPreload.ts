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

    // Pre-cache map tiles along route (sample key points)
    const routeCoords = circuit.route;
    if (routeCoords.length > 0) {
      // Cache tiles at zoom levels 13-16 for a selection of route points
      const sampleCount = Math.min(routeCoords.length, 20);
      const step = Math.max(1, Math.floor(routeCoords.length / sampleCount));
      const zoomLevels = [14, 15, 16];

      for (let i = 0; i < routeCoords.length; i += step) {
        const [lat, lng] = routeCoords[i];
        for (const z of zoomLevels) {
          const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z));
          const latRad = (lat * Math.PI) / 180;
          const y = Math.floor(
            ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z)
          );
          // Use multiple subdomains for parallel loading
          const sub = ["a", "b", "c"][i % 3];
          urls.push({
            url: `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
            label: "Carte",
          });
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
