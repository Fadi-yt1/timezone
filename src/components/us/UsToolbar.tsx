'use client';

import { useMemo, useRef, useState } from 'react';
import { useUsSettings, type LabelMode } from './UsSettings';
import type { UsStateRow } from '@/lib/us';

const LABEL_OPTIONS: { value: LabelMode; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'abbr', label: 'Abbr' },
  { value: 'blank', label: 'Blank' },
];

/** Display controls sitting above the map: label mode, clock format, find a state, print. */
export function UsToolbar({ states }: { states: UsStateRow[] }) {
  const { hour12, setHour12, labelMode, setLabelMode, setFocused, mapHidden, setMapHidden } =
    useUsSettings();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return states
      .filter((s) => s.name.toLowerCase().includes(q) || s.usps.toLowerCase() === q)
      .slice(0, 7);
  }, [query, states]);

  const choose = (s: UsStateRow) => {
    setFocused(s.fips);
    setQuery(s.name);
    setOpen(false);
    document.getElementById(`state-${s.usps}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  return (
    <div
      data-print-hide
      className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-4 py-3 sm:px-5"
    >
      <div className="flex items-center gap-2">
        <span className="label">Labels</span>
        <div className="flex rounded-lg border border-line p-0.5">
          {LABEL_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setLabelMode(o.value)}
              aria-pressed={labelMode === o.value}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                labelMode === o.value ? 'bg-accent text-canvas' : 'text-muted hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="label">Clock</span>
        <div className="flex rounded-lg border border-line p-0.5">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setHour12(v)}
              aria-pressed={hour12 === v}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                hour12 === v ? 'bg-accent text-canvas' : 'text-muted hover:text-ink'
              }`}
            >
              {v ? '12' : '24'}
            </button>
          ))}
        </div>
      </div>

      <div ref={boxRef} className="relative min-w-[200px] flex-1">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) {
              e.preventDefault();
              choose(matches[0]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Find a state…"
          aria-label="Find a state"
          className="field py-2 text-sm"
        />
        {open && matches.length > 0 && (
          <ul className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl2 border border-line
                         bg-surface py-1 shadow-2xl shadow-black/40">
            {matches.map((s) => (
              <li key={s.fips}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(s)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-raised"
                >
                  <span className="text-ink">{s.name}</span>
                  <span className="clock text-[11px] text-faint">{s.short}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMapHidden(!mapHidden)}
        aria-pressed={mapHidden}
        className="btn px-3 py-1.5 text-xs"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          {mapHidden ? (
            <>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" />
            </>
          ) : (
            <path
              d="M3 3l18 18M10.6 10.7a2.6 2.6 0 0 0 3.7 3.7M6.5 6.6C4 8.2 2 12 2 12s3.5 7 10 7c2 0 3.7-.6 5.2-1.5M19.9 15.2C21.3 13.7 22 12 22 12s-3.5-7-10-7c-.9 0-1.7.1-2.5.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        {mapHidden ? 'Show map' : 'Hide map'}
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="btn px-3 py-1.5 text-xs print:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Print
      </button>
    </div>
  );
}
