/**
 * Prefixes a path in public/ with the deployment's base path.
 *
 * next/link and next/image apply basePath themselves, but raw <img src> and
 * <a href> do not — on GitHub Pages the site lives under /<repo>, so those
 * would 404 without this.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function asset(path: string): string {
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
