'use client';

import { useEffect, useRef, useState } from 'react';
import type { SearchHit } from '@/lib/data';

/**
 * Type-ahead zone chooser used by the converter, planner and world clock.
 * Queries the same /api/v1/search endpoint the header search uses.
 */
export function ZonePicker({
  label,
  value,
  onSelect,
  placeholder = 'Add a city or time zone…',
  clearOnSelect = false,
}: {
  label?: string;
  value?: string;
  onSelect: (zone: string, title: string) => void;
  placeholder?: string;
  clearOnSelect?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(q)}&limit=7`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          setHits((d.results ?? []).filter((h: SearchHit) => h.zone));
          setActive(0);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 130);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (hit: SearchHit) => {
    onSelect(hit.zone, hit.title);
    setOpen(false);
    setQuery(clearOnSelect ? '' : hit.title);
  };

  return (
    <div ref={ref} className="relative">
      {label && <label className="label mb-1.5 block">{label}</label>}
      <input
        type="text"
        value={open || query ? query : (value ?? '')}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setQuery('');
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (!open || !hits.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % hits.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + hits.length) % hits.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(hits[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="field"
        aria-label={label ?? placeholder}
      />
      {open && hits.length > 0 && (
        <ul className="scroll-slim absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl2
                       border border-line bg-surface py-1.5 shadow-2xl shadow-black/40">
          {hits.map((hit, i) => (
            <li key={`${hit.kind}-${hit.title}-${hit.zone}`}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(hit)}
                className={`block w-full px-3.5 py-2 text-left ${i === active ? 'bg-raised' : ''}`}
              >
                <span className="block truncate text-sm text-ink">{hit.title}</span>
                <span className="block truncate text-xs text-faint">{hit.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
