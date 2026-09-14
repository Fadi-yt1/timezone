/**
 * A meridian line crossing a globe: the prime-meridian idea the product is named for.
 */
export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Meridian">
      <circle cx="16" cy="16" r="13.2" className="fill-raised stroke-line" strokeWidth="1.4" />
      <path
        d="M16 2.8c3.6 3.5 5.6 8.2 5.6 13.2S19.6 25.7 16 29.2c-3.6-3.5-5.6-8.2-5.6-13.2S12.4 6.3 16 2.8Z"
        className="stroke-muted"
        fill="none"
        strokeWidth="1.3"
      />
      <path d="M3.4 11.6h25.2M3.4 20.4h25.2" className="stroke-muted" strokeWidth="1.3" fill="none" />
      <path d="M16 2.8v26.4" className="stroke-accent" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="16" r="2.6" className="fill-accent" />
    </svg>
  );
}
