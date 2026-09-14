import { hourColor } from '@/lib/format';

/** The 24-hour colour key that makes the map readable at a glance. */
export function MapLegend() {
  const hours = Array.from({ length: 24 }, (_, h) => h);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="label">Local hour</span>
      <div className="flex min-w-[220px] flex-1 items-center gap-2">
        <span className="clock text-[11px] text-faint">00</span>
        <div className="flex h-2.5 flex-1 overflow-hidden rounded-full">
          {hours.map((h) => (
            <span key={h} className="flex-1" style={{ background: hourColor(h) }} />
          ))}
        </div>
        <span className="clock text-[11px] text-faint">23</span>
      </div>
      <span className="flex items-center gap-1.5 text-[11px] text-faint">
        <span
          className="h-2.5 w-4 rounded-sm ring-1 ring-line"
          style={{ background: 'rgb(var(--veil))', opacity: 'calc(var(--veil-opacity) + 0.25)' }}
        />
        Night side
      </span>
    </div>
  );
}
