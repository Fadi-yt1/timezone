// Rasterizes the printable SVGs to PNG so the site can offer both formats.
// Run locally after build-printables.mjs; the PNGs are committed, so the
// deploy build never needs a browser.
import fs from 'node:fs';
import path from 'node:path';
// Playwright is a local-only tool here, resolved from wherever it is installed.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const DIR = path.join(process.cwd(), 'public/printables');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg'));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// Full resolution for download, plus a light thumbnail for the page itself.
const RENDITIONS = [
  { suffix: '.png', scale: 2 },
  { suffix: '-preview.png', scale: 0.5 },
];

for (const { suffix, scale } of RENDITIONS) {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 860 },
    deviceScaleFactor: scale,
  });
  for (const f of files) {
    const svg = fs.readFileSync(path.join(DIR, f), 'utf8');
    await page.setContent(`<style>html,body{margin:0;padding:0}</style>${svg}`, {
      waitUntil: 'networkidle',
    });
    const out = path.join(DIR, f.replace(/\.svg$/, suffix));
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1100, height: 860 } });
    console.log(`${path.basename(out)}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
  await page.close();
}
await browser.close();
