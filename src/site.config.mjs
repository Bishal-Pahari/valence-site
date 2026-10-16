// One place for the values that change per deployment. Set them as environment variables at build time.
//   SITE_URL      the public origin, e.g. https://valence.dev (no trailing slash). Placeholder until a domain exists.
//   PUBLIC_GA_ID  a GA4 measurement ID (G-XXXXXXXXXX). Empty means no analytics code, no banner, and the privacy page says so.
export const SITE_URL = (process.env.SITE_URL || 'https://valence.example').replace(/\/$/, '');
export const GA_ID = /^G-[A-Z0-9]{6,}$/.test(process.env.PUBLIC_GA_ID ?? '') ? process.env.PUBLIC_GA_ID : '';
export const SITE_IS_PLACEHOLDER = SITE_URL === 'https://valence.example';

export const SITE_NAME = 'Valence';
export const AUTHOR = 'Bishal Pahari';
export const REPO = 'https://github.com/Bishal-Pahari/valence';
export const DOCS_REPO = 'https://github.com/Bishal-Pahari/valence-site';
export const VERSION = '0.3.0';
export const DESCRIPTION =
  'Ship your web app inside a Flutter shell. Signed over-the-air UI updates without store review, offline-first native SQLite, and a typed bridge.';
