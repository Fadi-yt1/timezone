// Builds the site for ordinary shared hosting — Apache/cPanel, byethost,
// Hostinger, a plain nginx box — where you upload files and nothing runs Node.
//
// This is the same static export the GitHub Pages build produces, with two
// differences: it is served from the domain root rather than /<repo>, so there
// is no basePath, and it ships an .htaccess instead of .nojekyll.
//
// Usage:
//   SITE_URL=https://example.com node scripts/build-static.mjs
//
// SITE_URL only affects sitemap.xml, canonical links and the Open Graph tags.
// Getting it wrong costs SEO, not function: the site works either way.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PLACEHOLDER = 'https://your-domain.example';
const siteUrl = (process.env.SITE_URL ?? PLACEHOLDER).replace(/\/+$/, '');

const API = path.join(process.cwd(), 'src/app/api/v1');
const PARKED = path.join(process.cwd(), '.api-v1.parked');
const OUT = path.join(process.cwd(), 'out');

// The /api/v1 route handlers read request search params, which a static export
// cannot do, so they are moved aside for the build and put back afterwards.
if (fs.existsSync(PARKED)) fs.rmSync(PARKED, { recursive: true, force: true });
const hadApi = fs.existsSync(API);
if (hadApi) fs.renameSync(API, PARKED);

const HTACCESS = `# Meridian — static site configuration for Apache shared hosting.

Options -Indexes
DirectoryIndex index.html

# Pages are exported as <name>/index.html, so Apache serves them as directories
# with no rewriting needed. This only covers genuinely missing URLs.
ErrorDocument 404 /404.html

<IfModule mod_mime.c>
  AddType application/json                .json
  AddType image/svg+xml                   .svg
  AddType font/woff2                      .woff2
  AddType application/manifest+json       .webmanifest
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml
  AddOutputFilterByType DEFLATE application/javascript application/json
  AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  # Pages are rebuilt with the clock baked in, so they must not be cached hard.
  ExpiresByType text/html                 "access plus 10 minutes"
  ExpiresByType application/json          "access plus 1 day"
  ExpiresByType image/png                 "access plus 7 days"
  ExpiresByType image/svg+xml             "access plus 7 days"
</IfModule>

# Everything under _next/static carries a content hash in its filename, so a
# given URL's contents can never change and it is safe to cache forever.
<IfModule mod_headers.c>
  <FilesMatch "\\.(js|css|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`;

try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Selects output:'export' in next.config.mjs.
      GITHUB_PAGES: 'true',
      // Empty, not unset: the config falls back to '/timezone' when unset.
      PAGES_BASE_PATH: '',
      NEXT_PUBLIC_SITE_URL: siteUrl,
      NEXT_PUBLIC_STATIC_BUILD: 'true',
    },
  });

  fs.writeFileSync(path.join(OUT, '.htaccess'), HTACCESS);

  const notFound = path.join(OUT, '404.html');
  if (!fs.existsSync(notFound)) {
    fs.copyFileSync(path.join(OUT, 'index.html'), notFound);
  }
  // Only meaningful on GitHub Pages; it would be dead weight in the upload.
  fs.rmSync(path.join(OUT, '.nojekyll'), { force: true });

  console.log(`\nStatic site ready in out/  (site URL: ${siteUrl})`);
  if (siteUrl === PLACEHOLDER) {
    console.log(
      'NOTE: SITE_URL was not set, so sitemap.xml and the canonical tags point\n' +
        '      at a placeholder. Re-run with SITE_URL=https://your-real-domain\n' +
        '      to correct them.',
    );
  }
} finally {
  if (hadApi) {
    fs.rmSync(API, { recursive: true, force: true });
    fs.renameSync(PARKED, API);
  }
}
