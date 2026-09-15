import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { MeetingPlanner } from '@/components/tools/MeetingPlanner';

export const metadata: Metadata = {
  title: 'Meeting planner',
  description:
    'Find a meeting time that works across time zones. Compare working hours for up to a ' +
    'dozen cities on one 24-hour grid and see exactly where they overlap.',
  alternates: { canonical: '/meeting-planner' },
};

export default function MeetingPlannerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tool"
        title="Meeting planner"
        lede="Put everyone on one grid. Each row is a participant's local clock across a single day, so the hours that work for the whole group are the ones lit up in every row at once."
      />
      <div className="shell py-8">
        <MeetingPlanner
          initialNow={Date.now()}
          initialRows={[
            { zone: 'Europe/London', title: 'London' },
            { zone: 'America/New_York', title: 'New York' },
            { zone: 'America/Los_Angeles', title: 'San Francisco' },
            { zone: 'Asia/Singapore', title: 'Singapore' },
          ]}
        />
      </div>
    </>
  );
}
