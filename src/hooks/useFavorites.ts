import { useEffect, useState, useCallback } from "react";

const KEY = "tilo:favorites";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => read());

  useEffect(() => {
    const handler = () => setFavorites(read());
    window.addEventListener("storage", handler);
    window.addEventListener("tilo:favorites-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("tilo:favorites-changed", handler);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("tilo:favorites-changed"));
    setFavorites(next);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggle, isFavorite };
}
