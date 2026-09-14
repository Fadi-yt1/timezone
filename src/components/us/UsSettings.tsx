'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type LabelMode = 'abbr' | 'name' | 'blank';

interface UsSettings {
  hour12: boolean;
  setHour12: (v: boolean) => void;
  labelMode: LabelMode;
  setLabelMode: (v: LabelMode) => void;
  /** FIPS of the state the reader searched for, highlighted on the map. */
  focused: string | null;
  setFocused: (v: string | null) => void;
}

const Ctx = createContext<UsSettings | null>(null);

const STORAGE_KEY = 'meridian-us-prefs';

/** Shared display settings for the US page: the toolbar writes, map and grid read. */
export function UsSettingsProvider({ children }: { children: React.ReactNode }) {
  const [hour12, setHour12] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>('abbr');
  const [focused, setFocused] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<{ hour12: boolean; labelMode: LabelMode }>;
        if (typeof p.hour12 === 'boolean') setHour12(p.hour12);
        if (p.labelMode) setLabelMode(p.labelMode);
      }
    } catch {
      /* no saved preference */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ hour12, labelMode }));
    } catch {
      /* ignore */
    }
  }, [hour12, labelMode, loaded]);

  const value = useMemo(
    () => ({ hour12, setHour12, labelMode, setLabelMode, focused, setFocused }),
    [hour12, labelMode, focused],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUsSettings(): UsSettings {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUsSettings must be used inside UsSettingsProvider');
  return ctx;
}
