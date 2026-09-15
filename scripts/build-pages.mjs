// Builds the static export for GitHub Pages.
//
// Route handlers cannot be statically exported — they read request search
// params — so src/app/api/v1 is moved aside for the build and restored after,
// whether the build succeeds or not. The /api documentation page stays.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const API = path.join(process.cwd(), 'src/app/api/v1');
const PARKED = path.join(process.cwd(), '.api-v1.parked');

if (fs.existsSync(PARKED)) fs.rmSync(PARKED, { recursive: true, force: true });
const hadApi = fs.existsSync(API);
if (hadApi) fs.renameSync(API, PARKED);

try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      NEXT_PUBLIC_STATIC_BUILD: 'true',
    },
  });
  // GitHub Pages runs Jekyll by default, which ignores _next/.
  fs.writeFileSync(path.join(process.cwd(), 'out/.nojekyll'), '');
  // A copy of index.html as 404.html gives client-side routing a sane fallback.
  const notFound = path.join(process.cwd(), 'out/404.html');
  if (!fs.existsSync(notFound)) {
    fs.copyFileSync(path.join(process.cwd(), 'out/index.html'), notFound);
  }
  console.log('\nStatic export ready in out/');
} finally {
  if (hadApi) {
    fs.rmSync(API, { recursive: true, force: true });
    fs.renameSync(PARKED, API);
  }
}
