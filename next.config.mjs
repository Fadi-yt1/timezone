/**
 * The site builds two ways:
 *   - default: a Node server (SSR pages + the /api/v1 route handlers)
 *   - GITHUB_PAGES=true: a fully static export for GitHub Pages
 *
 * Pages serves static files only, so the export drops the API routes and
 * pre-renders every page. A project site is served from /<repo>, hence
 * basePath; a user site (<user>.github.io) is served from the root.
 */
const isPages = process.env.GITHUB_PAGES === 'true';

/**
 * actions/configure-pages reports a user site's base path as "/", which Next
 * rejects: basePath must be empty, or start with a slash and not end with one.
 * Normalising here means switching a project site to a user site is a rename on
 * GitHub and nothing else — the workflow passes whatever Pages reports and this
 * turns it into something Next accepts.
 */
const normaliseBasePath = (raw) => (raw ?? '').replace(/\/+$/, '');

const basePath = isPages ? normaliseBasePath(process.env.PAGES_BASE_PATH ?? '/timezone') : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Exposed so raw public/ asset URLs can be prefixed; next/link handles its own.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(isPages
    ? {
        output: 'export',
        basePath,
        assetPrefix: basePath,
        // The Pages CDN has no image optimiser behind it.
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        compress: true,
        // Custom headers require a server, so they are omitted from the export.
        async headers() {
          return [
            {
              source: '/api/:path*',
              headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
              ],
            },
            {
              source: '/:path*',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
