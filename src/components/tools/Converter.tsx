'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ZonePicker } from '@/components/ZonePicker';
import { dayShiftLabel, formatClock, formatDate, hourColor } from '@/lib/format';
import { formatUtcLabel, fromZonedTime, offsetMinutes, zonedParts } from '@/lib/time';

interface Row {
  zone: string;
  title: string;
}

const dateKey = (zone: string, at: number) => {
  const p = zonedParts(zone, at);
  return Date.UTC(p.year, p.month - 1, p.day);
};

export function Converter({
  initialNow,
  initialFrom,
  initialTo,
}: {
  initialNow: number;
  initialFrom: Row;
  initialTo: Row[];
}) {
  const [from, setFrom] = useState<Row>(initialFrom);
  const [targets, setTargets] = useState<Row[]>(initialTo);
  const [liveMode, setLiveMode] = useState(true);
  const [now, setNow] = useState(initialNow);

  const startParts = zonedParts(initialFrom.zone, initialNow);
  const [date, setDate] = useState(
    `${startParts.year}-${String(startParts.month).padStart(2, '0')}-${String(startParts.day).padStart(2, '0')}`,
  );
  const [time, setTime] = useState(
    `${String(startParts.hour).padStart(2, '0')}:${String(startParts.minute).padStart(2, '0')}`,
  );

  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [liveMode]);

  // The instant being converted: live, or the chosen wall time in `from`.
  const at = useMemo(() => {
    if (liveMode) return now;
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const t = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!d || !t) return now;
    return fromZonedTime(from.zone, +d[1], +d[2], +d[3], +t[1], +t[2], 0);
  }, [liveMode, now, date, time, from.zone]);

  const baseOffset = offsetMinutes(from.zone, at);

  const addTarget = (zone: string, title: string) => {
    if (zone === from.zone || targets.some((t) => t.zone === zone)) return;
    setTargets((prev) => [...prev, { zone, title }]);
  };

  /** Promote a destination to the source, sending the old source the other way. */
  const swapInto = (row: Row) => {
    setTargets((prev) => [...prev.filter((t) => t.zone !== row.zone), from]);
    setFrom(row);
    const p = zonedParts(row.zone, at);
    setDate(`${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`);
    setTime(`${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="card h-fit p-5 lg:sticky lg:top-24">
        <h2 className="display text-lg font-semibold">Convert from</h2>

        <div className="mt-4">
          <ZonePicker
            label="Source city or zone"
            value={from.title}
            onSelect={(zone, title) => setFrom({ zone, title })}
          />
        </div>

        <div className="mt-4 flex rounded-lg border border-line p-1">
          {([true, false] as const).map((mode) => (
            <button
              key={String(mode)}
              type="button"
              onClick={() => setLiveMode(mode)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                liveMode === mode ? 'bg-accent text-canvas' : 'text-muted hover:text-ink'
              }`}
            >
              {mode ? 'Right now' : 'Pick a time'}
            </button>
          ))}
        </div>

        {!liveMode && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block" htmlFor="conv-date">Date</label>
              <input id="conv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
            </div>
            <div>
              <label className="label mb-1.5 block" htmlFor="conv-time">Time</label>
              <input id="conv-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field" />
            </div>
          </div>
        )}

        <div className="mt-5 rounded-lg border border-line bg-canvas p-4">
          <p className="label">{from.title}</p>
          <p className="clock mt-1.5 text-3xl font-bold leading-none">
            {formatClock(from.zone, at, { seconds: liveMode })}
          </p>
          <p className="mt-2 text-xs text-faint">
            {formatDate(from.zone, at)} · {formatUtcLabel(baseOffset)}
          </p>
        </div>

        <div className="mt-5">
          <ZonePicker label="Add a destination" onSelect={addTarget} clearOnSelect placeholder="Add a city…" />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="display text-lg font-semibold">
            {targets.length} destination{targets.length === 1 ? '' : 's'}
          </h2>
          {targets.length > 0 && (
            <button type="button" onClick={() => setTargets([])} className="text-sm text-faint hover:text-accent">
              Clear all
            </button>
          )}
        </div>

        {targets.length === 0 ? (
          <div className="card p-10 text-center text-sm text-muted">
            Add a destination city to see the converted time.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {targets.map((row) => {
              const off = offsetMinutes(row.zone, at);
              const diff = off - baseOffset;
              const p = zonedParts(row.zone, at);
              const shift = dayShiftLabel(
                Math.round((dateKey(row.zone, at) - dateKey(from.zone, at)) / 86_400_000),
              );
              return (
                <li key={row.zone} className="card relative overflow-hidden p-4 pt-5">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: hourColor(p.hour + p.minute / 60) }}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.title}</p>
                      <p className="truncate text-xs text-faint">{row.zone}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => swapInto(row)}
                        title="Use as source"
                        aria-label={`Use ${row.title} as the source zone`}
                        className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-accent"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 16H3m0 0 4-4m-4 4 4 4M17 8h4m0 0-4-4m4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargets((prev) => prev.filter((t) => t.zone !== row.zone))}
                        aria-label={`Remove ${row.title}`}
                        className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-ink"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="clock mt-3 text-[1.75rem] font-bold leading-none">
                    {formatClock(row.zone, at, { seconds: liveMode })}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
                    <span>{formatDate(row.zone, at, { style: 'medium' })}</span>
                    {shift && <span className="font-medium text-accent">({shift})</span>}
                    <span aria-hidden="true">·</span>
                    <span className="clock">{formatUtcLabel(off)}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {diff === 0
                        ? 'same time'
                        : `${diff > 0 ? '+' : '−'}${Math.floor(Math.abs(diff) / 60)}h${
                            Math.abs(diff) % 60 ? ` ${Math.abs(diff) % 60}m` : ''
                          }`}
                    </span>
                  </div>
                  <Link href={`/time-zones/${row.zone}`} className="mt-3 inline-block text-xs text-accent hover:underline">
                    Zone details &rarr;
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
