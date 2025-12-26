import { useEffect, useRef } from "react";

export function useKeyboardBuffer(onEnter: (value: string) => void) {
  const bufferRef = useRef("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignorer les événements clavier quand on tape dans un input/textarea/select
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      // Vérifier que e.key existe et a une longueur
      if (!e.key) return;

      if (e.key === "Enter") {
        const raw = bufferRef.current;
        bufferRef.current = "";
        const cleaned = raw.trim();
        if (cleaned) onEnter(cleaned);
      } else {
        if (e.key.length === 1) bufferRef.current += e.key;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEnter]);
}
