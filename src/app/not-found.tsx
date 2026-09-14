import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="clock display text-6xl font-bold text-accent">404</p>
      <h1 className="display mt-4 text-2xl font-bold tracking-tight">No clock here</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        That page does not exist. Search for a city, country or time zone instead — there are a few
        hundred of them.
      </p>
      <div className="mt-7 w-full max-w-md">
        <SearchBox autoFocus placeholder="Search a city or time zone…" />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn">Home</Link>
        <Link href="/map" className="btn">World map</Link>
        <Link href="/time-zones" className="btn">All time zones</Link>
      </div>
    </div>
  );
}
