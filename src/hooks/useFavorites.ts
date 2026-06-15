import { useState } from 'react';
import { motion } from 'framer-motion';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('robot:favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (cmd: string) => {
    setFavorites((prev) => {
      const next = prev.includes(cmd)
        ? prev.filter((c) => c !== cmd)
        : [...prev, cmd];
      localStorage.setItem('robot:favorites', JSON.stringify(next));
      return next;
    });
  };

  const isFavorite = (cmd: string) => favorites.includes(cmd);

  return { favorites, toggleFavorite, isFavorite };
}