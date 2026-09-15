'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchHit } from '@/lib/data';
import { searchClient } from '@/lib/client-search';

const KIND_LABEL: Record<string, string> = { city: 'City', zone: 'Zone', country: 'Country' };

export function SearchBox({
  placeholder = 'Search a city, country or time zone…',
  autoFocus = false,
  size = 'md',
}: {
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'md' | 'lg';
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    // Debounced so typing doesn't fire a request per keystroke.
    const t = setTimeout(() => {
      searchClient(q, 8)
        .then((results) => {
          if (controller.signal.aborted) return;
          const d = { results };
          setHits(d.results ?? []);
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
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQuery('');
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !hits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint ${
            size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search cities, countries and time zones"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-results"
          className={`field ${size === 'lg' ? 'py-3.5 pl-11 text-base' : 'pl-10'}`}
        />
      </div>

      {open && hits.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="scroll-slim absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-xl2
                     border border-line bg-surface py-1.5 shadow-2xl shadow-black/40"
        >
          {hits.map((hit, i) => (
            <li key={`${hit.kind}-${hit.title}-${hit.zone}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(hit)}
                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left ${
                  i === active ? 'bg-raised' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{hit.title}</span>
                  <span className="block truncate text-xs text-faint">{hit.subtitle}</span>
                </span>
                <span className="label shrink-0">{KIND_LABEL[hit.kind]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
