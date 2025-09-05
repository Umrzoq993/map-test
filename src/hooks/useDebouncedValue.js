import { useEffect, useState } from "react";

// Simple debounced value hook: returns debounced version of input
// usage: const searchDebounced = useDebouncedValue(search, 300);
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
