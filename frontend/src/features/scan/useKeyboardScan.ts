import { useEffect, useRef, useCallback } from "react";

export function useKeyboardScan(onUID: (uid: string) => void, enabled: boolean = true) {
  const buffer = useRef("");
  const timeoutRef = useRef<number | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      if (e.key === "Enter") {
        const raw = buffer.current.trim();
        buffer.current = "";
        if (raw) {
          onUID(raw);
        }
      } else if (e.key.length === 1) {
        buffer.current += e.key;

        timeoutRef.current = window.setTimeout(() => {
          buffer.current = "";
        }, 100);
      }
    },
    [onUID, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyDown, enabled]);
}
