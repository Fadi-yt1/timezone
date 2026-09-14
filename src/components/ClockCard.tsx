'use client';

import Link from 'next/link';
import { useNow } from './LiveClock';
import { formatClock, formatDate, hourColor } from '@/lib/format';
import { formatUtcLabel, offsetMinutes, zonedParts } from '@/lib/time';

export interface ClockCardProps {
  zone: string;
  name: string;
  subtitle?: string | null;
  initialNow: number;
  href?: string;
  /** Minutes this zone differs from a reference zone, when comparing. */
  relativeTo?: { zone: string; label: string } | null;
  onRemove?: () => void;
  hour12?: boolean;
}

export function ClockCard({
  zone,
  name,
  subtitle,
  initialNow,
  href,
  relativeTo,
  onRemove,
  hour12 = false,
}: ClockCardProps) {
  const now = useNow(initialNow);
  const parts = zonedParts(zone, now);
  const offset = offsetMinutes(zone, now);
  const accent = hourColor(parts.hour + parts.minute / 60);

  const diff = relativeTo ? offset - offsetMinutes(relativeTo.zone, now) : null;
  const diffLabel =
    diff === null || diff === 0
      ? null
      : `${diff > 0 ? '+' : '−'}${Math.floor(Math.abs(diff) / 60)}h${
          Math.abs(diff) % 60 ? ` ${Math.abs(diff) % 60}m` : ''
        }`;

  const body = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 rounded-t-xl2"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{name}</p>
          {subtitle && <p className="truncate text-xs text-faint">{subtitle}</p>}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            aria-label={`Remove ${name}`}
            className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-faint
                       transition-colors hover:bg-raised hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <p className="clock mt-3 text-[2rem] font-bold leading-none text-ink">
        {formatClock(zone, now, { seconds: true, hour12 })}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-faint">
        <span>{formatDate(zone, now, { style: 'medium' })}</span>
        <span aria-hidden="true">·</span>
        <span className="clock">{formatUtcLabel(offset)}</span>
        {diffLabel && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-accent">
              {diffLabel} vs {relativeTo!.label}
            </span>
          </>
        )}
      </div>
    </>
  );

  const shell =
    'card card-hover relative overflow-hidden p-4 pt-5 block';

  return href ? (
    <Link href={href} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}
