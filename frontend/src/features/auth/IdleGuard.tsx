import React, { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || (process.env.NEXT_PUBLIC_SUPABASE_URL as string);
const SUPABASE_ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// 🕐 Durées
const SLEEP_MS = 20 * 60_000;   // 20 min → mode veille
const LOGOUT_MS = 60 * 60_000;  // 60 min → déconnexion locale
const FIXED_PIN = "9543";       // 🔒 PIN fixe (pas modifiable)

function useIdleTimer(onSleep: () => void, onLogout: () => void) {
  const sleepTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);

  const clearAll = useCallback(() => {
    if (sleepTimer.current) window.clearTimeout(sleepTimer.current);
    if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
  }, []);

  const armTimers = useCallback(() => {
    clearAll();
    sleepTimer.current = window.setTimeout(onSleep, SLEEP_MS);
    logoutTimer.current = window.setTimeout(onLogout, LOGOUT_MS);
  }, [clearAll, onSleep, onLogout]);

  const resetOnActivity = useCallback(() => {
    armTimers();
  }, [armTimers]);

  useEffect(() => {
    armTimers();
    const events = ["mousemove", "mousedown", "keypress", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetOnActivity, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetOnActivity));
      clearAll();
    };
  }, [armTimers, clearAll, resetOnActivity]);
}

export const IdleGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");

  const onSleep = useCallback(() => {
    setLocked(true);
    setError("");
    setPinInput("");
  }, []);

  const onLogout = useCallback(async () => {
    try {
      // 🔒 déconnexion locale (n'affecte pas les autres appareils)
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      window.location.href = "/login";
    }
  }, []);

  useIdleTimer(onSleep, onLogout);

  const handleUnlock = useCallback(() => {
    if (pinInput === FIXED_PIN) {
      setLocked(false);
      setError("");
      setPinInput("");
    } else {
      setError("Code PIN incorrect.");
      setPinInput("");
    }
  }, [pinInput]);

  return (
    <>
      {children}

      {locked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "radial-gradient(1200px 600px at 50% -10%, rgba(59,130,246,0.15), rgba(10,20,40,0.95))",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "rgba(20,29,59,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              color: "#fff",
            }}
          >
            <h3 className="text-xl font-semibold">🔒 Session verrouillée</h3>
            <p className="text-sm opacity-70 mt-1">
              Mode veille activé après 20 min d’inactivité.
            </p>

            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full mt-4 rounded-md bg-[#0E1B3A] border border-white/10 px-3 py-3 tracking-widest text-center text-lg outline-none"
            />

            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 bg-[#1E3A8A] hover:bg-[#2747a6] transition rounded-md py-2"
                onClick={handleUnlock}
              >
                Déverrouiller
              </button>
              <button
                className="flex-1 bg-[#6B7280] hover:bg-[#7b8596] transition rounded-md py-2"
                onClick={onLogout}
              >
                Changer d’utilisateur
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};