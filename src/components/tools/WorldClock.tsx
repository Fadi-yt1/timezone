'use client';

import { useEffect, useState } from 'react';
import { ClockCard } from '@/components/ClockCard';
import { ZonePicker } from '@/components/ZonePicker';

interface Row {
  zone: string;
  title: string;
}

const STORAGE_KEY = 'meridian-world-clock';

export function WorldClock({ initialNow, defaults }: { initialNow: number; defaults: Row[] }) {
  const [rows, setRows] = useState<Row[]>(defaults);
  const [hour12, setHour12] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Restore after mount so the server-rendered default list hydrates cleanly.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { rows?: Row[]; hour12?: boolean };
        if (Array.isArray(parsed.rows) && parsed.rows.length) setRows(parsed.rows);
        if (typeof parsed.hour12 === 'boolean') setHour12(parsed.hour12);
      }
    } catch {
      /* unavailable storage just means no saved list */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, hour12 }));
    } catch {
      /* ignore */
    }
  }, [rows, hour12, loaded]);

  const add = (zone: string, title: string) => {
    if (rows.some((r) => r.zone === zone)) return;
    setRows((prev) => [...prev, { zone, title }]);
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <span className="label mb-1.5 block">Add a city</span>
          <ZonePicker onSelect={add} clearOnSelect placeholder="Search for a city or time zone…" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-line p-1">
            {([false, true] as const).map((mode) => (
              <button
                key={String(mode)}
                type="button"
                onClick={() => setHour12(mode)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  hour12 === mode ? 'bg-accent text-canvas' : 'text-muted hover:text-ink'
                }`}
              >
                {mode ? '12h' : '24h'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRows(defaults)}
            className="text-sm text-faint hover:text-accent"
          >
            Reset
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          Your clock wall is empty — add a city above.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <ClockCard
              key={r.zone}
              zone={r.zone}
              name={r.title}
              subtitle={r.zone}
              initialNow={initialNow}
              hour12={hour12}
              onRemove={() => setRows((prev) => prev.filter((x) => x.zone !== r.zone))}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-faint">
        Your list is kept in this browser only — nothing is sent to a server or shared between devices.
      </p>
    </div>
  );
}
