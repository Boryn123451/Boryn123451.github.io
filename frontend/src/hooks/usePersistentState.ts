import { useEffect, useState } from "react";

export function usePersistentState<T>(
  key: string,
  initialValue: T,
  normalize?: (value: unknown) => T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return initialValue;
      }
      const parsed = JSON.parse(raw) as unknown;
      return normalize ? normalize(parsed) : (parsed as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
