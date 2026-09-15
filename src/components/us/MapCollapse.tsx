'use client';

import { useUsSettings } from './UsSettings';

/**
 * Collapses the map when the reader hides it. The map stays in the DOM so
 * showing it again is instant and needs no re-render of the geometry.
 */
export function MapCollapse({ children }: { children: React.ReactNode }) {
  const { mapHidden } = useUsSettings();
  return (
    <div hidden={mapHidden} className="print:!block">
      {children}
    </div>
  );
}
