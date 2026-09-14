import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { Converter } from '@/components/tools/Converter';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Time zone converter',
  description:
    'Convert a time from one city to any number of others. Live conversion across every ' +
    'IANA time zone, with daylight saving handled automatically.',
  alternates: { canonical: '/converter' },
};

export default function ConverterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tool"
        title="Time zone converter"
        lede="Choose a source city and a time, then read it off in as many destinations as you need. Daylight saving is applied for the exact date you pick, not just today."
      />
      <div className="shell py-8">
        <Converter
          initialNow={Date.now()}
          initialFrom={{ zone: 'Europe/London', title: 'London' }}
          initialTo={[
            { zone: 'America/New_York', title: 'New York' },
            { zone: 'Asia/Tokyo', title: 'Tokyo' },
            { zone: 'Asia/Kolkata', title: 'Mumbai' },
            { zone: 'Australia/Sydney', title: 'Sydney' },
          ]}
        />
      </div>
    </>
  );
}
