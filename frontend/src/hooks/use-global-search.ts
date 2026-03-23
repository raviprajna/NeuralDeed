import { useEffect, useCallback, useState } from 'react';

interface UseGlobalSearchProps {
  onSearch: (query: string) => void;
  enabled?: boolean;
}

export function useGlobalSearch({ onSearch, enabled = true }: UseGlobalSearchProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    },
    [isSearchOpen]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    isSearchOpen,
    setIsSearchOpen,
    onSearch,
  };
}
