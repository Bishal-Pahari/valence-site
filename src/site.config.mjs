// One place for the values that change per deployment. Set them as environment variables at build time.
//   SITE_URL      the public origin, no trailing slash. Defaults to the free Cloudflare Pages address until a domain is bought.
//   PUBLIC_GA_ID  a GA4 measurement ID (G-XXXXXXXXXX). Empty means no analytics code, no banner, and the privacy page says so.
export const SITE_URL = (process.env.SITE_URL || 'https://getvalence.pages.dev').replace(/\/$/, '');
export const GA_ID = /^G-[A-Z0-9]{6,}$/.test(process.env.PUBLIC_GA_ID ?? '') ? process.env.PUBLIC_GA_ID : '';

export const SITE_NAME = 'Valence';
export const AUTHOR = 'Bishal Pahari';
// Shown on the privacy page as the contact for data questions. Empty falls back to the issue tracker.
export const CONTACT_EMAIL = '';
export const REPO = 'https://github.com/Bishal-Pahari/valence';
export const DOCS_REPO = 'https://github.com/Bishal-Pahari/valence-site';
// Where "Report a problem" points. Security issues go through SECURITY.md in the code repo instead.
export const ISSUES = `${REPO}/issues/new`;
// Shown at the top of every docs page while Valence is in beta. HTML, rendered by Starlight.
export const BETA_BANNER =
  'Valence is in beta. The bundle format and update protocol are meant to stay stable; the CLI and the generated host code may still change. <a href="/docs/getting-started/beta/">What beta means</a>';
export const VERSION = '0.3.0';
export const DESCRIPTION =
  'Keep the native core, swap the web shell. Your web app becomes your mobile app’s interface: a small Flutter host that ships once, signed UI releases that roll back on their own, and offline-first native SQLite.';
