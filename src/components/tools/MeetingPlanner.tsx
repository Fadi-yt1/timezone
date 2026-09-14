'use client';

import { useEffect, useMemo, useState } from 'react';
import { ZonePicker } from '@/components/ZonePicker';
import { formatClock, hourColor } from '@/lib/format';
import { HOUR, formatUtcLabel, offsetMinutes, zonedParts } from '@/lib/time';

interface Row {
  zone: string;
  title: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function MeetingPlanner({
  initialNow,
  initialRows,
}: {
  initialNow: number;
  initialRows: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [start, setStart] = useState(9);
  const [end, setEnd] = useState(17);
  const [now, setNow] = useState(initialNow);
  const [selected, setSelected] = useState<number | null>(null);

  const anchorParts = zonedParts(initialRows[0]?.zone ?? 'UTC', initialNow);
  const [date, setDate] = useState(
    `${anchorParts.year}-${pad(anchorParts.month)}-${pad(anchorParts.day)}`,
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const anchorZone = rows[0]?.zone ?? 'UTC';

  /** Midnight on the chosen date, in the first row's zone. */
  const dayStart = useMemo(() => {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const p = zonedParts(anchorZone, now);
    const y = d ? +d[1] : p.year;
    const mo = d ? +d[2] : p.month;
    const day = d ? +d[3] : p.day;
    const guess = Date.UTC(y, mo - 1, day, 0, 0, 0);
    return guess - offsetMinutes(anchorZone, guess) * 60000;
  }, [date, anchorZone, now]);

  const slots = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const at = dayStart + i * HOUR;
      const cells = rows.map((r) => {
        const p = zonedParts(r.zone, at);
        const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
        const weekend = weekday === 0 || weekday === 6;
        return {
          zone: r.zone,
          hour: p.hour,
          minute: p.minute,
          label: formatClock(r.zone, at),
          day: p.day,
          month: p.month,
          weekend,
          working: !weekend && p.hour >= start && p.hour < end,
        };
      });
      const workingCount = cells.filter((c) => c.working).length;
      return { at, cells, workingCount, allWorking: rows.length > 0 && workingCount === rows.length };
    });
  }, [dayStart, rows, start, end]);

  const overlapHours = slots.filter((s) => s.allWorking).length;
  const bestCount = slots.length ? Math.max(...slots.map((s) => s.workingCount)) : 0;

  const addRow = (zone: string, title: string) => {
    if (rows.some((r) => r.zone === zone)) return;
    setRows((prev) => [...prev, { zone, title }]);
  };

  const selectedSlot = selected !== null ? slots[selected] : null;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label mb-1.5 block" htmlFor="plan-date">Meeting date</label>
            <input id="plan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label mb-1.5 block" htmlFor="plan-start">Working day starts</label>
            <select
              id="plan-start"
              value={start}
              onChange={(e) => setStart(Math.min(Number(e.target.value), end - 1))}
              className="field"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{pad(h)}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-1.5 block" htmlFor="plan-end">Working day ends</label>
            <select
              id="plan-end"
              value={end}
              onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 1))}
              className="field"
            >
              {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                <option key={h} value={h}>{pad(h === 24 ? 0 : h)}:00</option>
              ))}
            </select>
          </div>
          <div>
            <span className="label mb-1.5 block">Add a participant</span>
            <ZonePicker onSelect={addRow} clearOnSelect placeholder="Add a city…" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
          <span className={overlapHours ? 'font-semibold text-accent' : 'font-semibold text-muted'}>
            {overlapHours > 0
              ? `${overlapHours} hour${overlapHours === 1 ? '' : 's'} where everyone is working`
              : 'No hour works for everyone'}
          </span>
          {overlapHours === 0 && bestCount > 0 && (
            <span className="text-muted">
              Best available: {bestCount} of {rows.length} participants
            </span>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">Add at least one city to plan a meeting.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <caption className="sr-only">
                Local time in each participant&rsquo;s zone for each hour of {date}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-52 bg-surface px-4 py-3 text-left">
                    <span className="label">Participant</span>
                  </th>
                  {slots.map((s, i) => {
                    const p = zonedParts(anchorZone, s.at);
                    return (
                      <th
                        key={i}
                        scope="col"
                        className={`px-0 py-3 text-center text-[11px] font-semibold ${
                          s.allWorking ? 'text-accent' : 'text-faint'
                        }`}
                      >
                        {pad(p.hour)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={row.zone} className="border-t border-line">
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-left">
                      <span className="block truncate text-sm font-medium text-ink">{row.title}</span>
                      <span className="clock block text-[11px] text-faint">
                        {formatUtcLabel(offsetMinutes(row.zone, dayStart))}
                      </span>
                      {ri > 0 && (
                        <button
                          type="button"
                          onClick={() => setRows((prev) => prev.filter((r) => r.zone !== row.zone))}
                          className="mt-0.5 text-[11px] text-faint hover:text-accent"
                        >
                          Remove
                        </button>
                      )}
                    </th>
                    {slots.map((s, i) => {
                      const cell = s.cells[ri];
                      return (
                        <td
                          key={i}
                          onClick={() => setSelected(i === selected ? null : i)}
                          title={`${row.title} — ${cell.label}`}
                          className={`cursor-pointer border-l border-line/50 p-0 text-center align-middle
                                      ${selected === i ? 'ring-2 ring-inset ring-accent' : ''}`}
                        >
                          <span
                            className="flex h-11 items-center justify-center text-[11px] font-semibold"
                            style={{
                              background: cell.working
                                ? hourColor(cell.hour, { lift: 6 })
                                : `color-mix(in srgb, ${hourColor(cell.hour)} 26%, transparent)`,
                              color: cell.working ? 'rgb(12 18 32)' : 'rgb(var(--muted))',
                            }}
                          >
                            {pad(cell.hour)}
                            {cell.weekend && <span className="ml-0.5 opacity-70">·</span>}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-[11px] text-faint">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-sm" style={{ background: hourColor(11, { lift: 6 }) }} />
              Inside working hours
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-sm border border-line" style={{ background: 'color-mix(in srgb, ' + hourColor(2) + ' 26%, transparent)' }} />
              Outside working hours
            </span>
            <span>· marks a weekend</span>
          </div>
        </div>
      )}

      {selectedSlot && (
        <div className="card p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="display text-lg font-semibold">Selected slot</h2>
            <button type="button" onClick={() => setSelected(null)} className="text-sm text-faint hover:text-accent">
              Clear
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">
            {new Date(selectedSlot.at).toUTCString().replace('GMT', 'UTC')} ·{' '}
            {selectedSlot.workingCount} of {rows.length} inside working hours
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => {
              const c = selectedSlot.cells[i];
              return (
                <li key={r.zone} className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3.5 py-2.5">
                  <span className="min-w-0 truncate text-sm">{r.title}</span>
                  <span className={`clock text-sm font-semibold ${c.working ? 'text-accent' : 'text-muted'}`}>
                    {c.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
