import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

import heroJura from "@/assets/hero-jura.jpg";

const defaultImage = heroJura;

export interface CircuitWithStops {
  id: string;
  title: string;
  description: string | null;
  region: string | null;
  duration: string | null;
  distance: string | null;
  difficulty: string | null;
  price: number;
  rating: number | null;
  review_count: number | null;
  image: string;
  route: [number, number][];
  published: boolean | null;
  creator_id: string;
  stops: {
    id: string;
    title: string;
    description: string | null;
    lat: number;
    lng: number;
    type: string;
    duration: string | null;
    sort_order: number | null;
  }[];
  audio_zones: {
    id: string;
    lat: number;
    lng: number;
    audio_text: string | null;
    audio_url: string | null;
    radius_meters: number | null;
    sort_order: number | null;
  }[];
  music_segments: {
    id: string;
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    track_name: string;
    artist_name: string | null;
    preview_url: string | null;
    artwork_url: string | null;
  }[];
}

function mapCircuit(
  circuit: Tables<"circuits">,
  stops: Tables<"circuit_stops">[],
  audioZones: Tables<"audio_zones">[],
  musicSegments: Tables<"music_segments">[] = []
): CircuitWithStops {
  const route = Array.isArray(circuit.route) ? (circuit.route as [number, number][]) : [];
  return {
    id: circuit.id,
    title: circuit.title,
    description: circuit.description,
    region: circuit.region,
    duration: circuit.duration,
    distance: circuit.distance,
    difficulty: circuit.difficulty,
    price: Number(circuit.price),
    rating: circuit.rating ? Number(circuit.rating) : null,
    review_count: circuit.review_count,
    image: circuit.image_url || defaultImage,
    route,
    published: circuit.published,
    creator_id: circuit.creator_id,
    stops: stops
      .filter((s) => s.circuit_id === circuit.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        lat: s.lat,
        lng: s.lng,
        type: s.stop_type || "site",
        duration: s.duration,
        sort_order: s.sort_order,
      })),
    audio_zones: audioZones
      .filter((a) => a.circuit_id === circuit.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    music_segments: musicSegments
      .filter((m) => m.circuit_id === circuit.id)
      .map((m) => ({
        id: m.id,
        start_lat: m.start_lat,
        start_lng: m.start_lng,
        end_lat: m.end_lat,
        end_lng: m.end_lng,
        track_name: m.track_name,
        artist_name: m.artist_name,
        preview_url: m.preview_url,
        artwork_url: m.artwork_url,
      })),
  };
}

export function useCircuits() {
  return useQuery({
    queryKey: ["circuits"],
    queryFn: async () => {
      const [circuitsRes, stopsRes, audioRes] = await Promise.all([
        supabase.from("circuits").select("*").eq("published", true),
        supabase.from("circuit_stops").select("*"),
        supabase.from("audio_zones").select("*"),
      ]);

      if (circuitsRes.error) throw circuitsRes.error;
      const stops = stopsRes.data || [];
      const audio = audioRes.data || [];

      return circuitsRes.data.map((c) => mapCircuit(c, stops, audio));
    },
  });
}

export function useCircuit(id: string | undefined) {
  return useQuery({
    queryKey: ["circuit", id],
    enabled: !!id,
    queryFn: async () => {
      const [circuitRes, stopsRes, audioRes] = await Promise.all([
        supabase.from("circuits").select("*").eq("id", id!).single(),
        supabase.from("circuit_stops").select("*").eq("circuit_id", id!),
        supabase.from("audio_zones").select("*").eq("circuit_id", id!),
      ]);

      if (circuitRes.error) throw circuitRes.error;
      return mapCircuit(circuitRes.data, stopsRes.data || [], audioRes.data || []);
    },
  });
}

export function useUserPurchases() {
  return useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchases").select("*, circuits(*)");
      if (error) throw error;
      return data;
    },
  });
}
