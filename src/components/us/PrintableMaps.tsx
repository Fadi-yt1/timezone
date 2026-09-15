import { asset } from '@/lib/asset';
interface Printable {
  file: string;
  title: string;
  body: string;
}

const PRINTABLES: Printable[] = [
  {
    file: 'us-time-zones-color',
    title: 'US time zone map, colour',
    body:
      'All four continental zones plus Alaska, Hawaii and Arizona, colour-coded with state ' +
      'abbreviations and a legend. The one to pin above a desk.',
  },
  {
    file: 'us-time-zones-grayscale',
    title: 'US time zone map, greyscale',
    body:
      'The same map shaded for black-and-white printers, with darker outlines so neighbouring ' +
      'zones stay distinct on a mono laser printer.',
  },
  {
    file: 'us-blank-map',
    title: 'Blank US state map',
    body:
      'State borders and abbreviations with no zone colouring — useful for quizzes, worksheets ' +
      'or marking up your own regions.',
  },
];

/**
 * Downloadable, print-ready maps. Both formats are generated ahead of time from
 * the same geometry the interactive map uses, so they never drift out of step.
 */
export function PrintableMaps() {
  return (
    <section id="printable" className="mt-14 scroll-mt-24">
      <h2 className="display text-2xl font-bold tracking-tight">Printable time zone maps</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        Free to download and print — no sign-up. Each map comes as a scalable SVG that prints
        crisply at any size, or a high-resolution PNG for dropping into a document or slide.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRINTABLES.map((p) => (
          <li key={p.file} className="card flex flex-col overflow-hidden">
            <a
              href={asset(`/printables/${p.file}.svg`)}
              target="_blank"
              rel="noreferrer noopener"
              className="block border-b border-line bg-white transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset(`/printables/${p.file}-preview.png`)}
                alt={`Preview of the ${p.title.toLowerCase()}`}
                width={550}
                height={430}
                loading="lazy"
                decoding="async"
                className="h-auto w-full"
              />
            </a>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-semibold text-ink">{p.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{p.body}</p>
              <div className="mt-4 flex gap-2">
                <a href={asset(`/printables/${p.file}.svg`)} download className="btn btn-primary flex-1 px-3 py-2 text-xs">
                  SVG
                </a>
                <a href={asset(`/printables/${p.file}.png`)} download className="btn flex-1 px-3 py-2 text-xs">
                  PNG
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
