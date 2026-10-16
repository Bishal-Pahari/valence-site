// Share-image (Open Graph) settings, used by src/pages/og/[...route].ts.
import { join } from 'node:path';

// Resolved from the project root: during the build this module is bundled, so import.meta.url no longer points at src/.
const font = (name: string) => join(process.cwd(), 'src', 'fonts', name);

export const OG_FONTS = [font('gs-bold.ttf'), font('gs-medium.ttf'), font('rm-medium.ttf')];
export const OG_LOGO = join(process.cwd(), 'src', 'assets', 'logo-og.png');
// brand/valence-social-banner.png flattened onto its own background (#F9F8FA): artwork on the right, the left side empty for text.
export const OG_BANNER = join(process.cwd(), 'src', 'assets', 'og-banner.png');
export const OG_BG: [number, number, number] = [249, 248, 250];

/** Marketing pages that need a share image. Docs pages come from the content collection. */
export const MARKETING_OG = {
  home: {
    title: 'Keep the core.\nSwap the shell.',
    description: 'Your web app becomes your mobile app’s interface: a small Flutter host that ships once, signed UI releases that roll back on their own, and offline-first SQLite.',
  },
  privacy: {
    title: 'Privacy policy',
    description: 'What this website collects, what it does not, and how to opt out.',
  },
  'not-found': {
    title: 'Page not found',
    description: 'This page does not exist. Try the docs or the home page.',
  },
} as const;

/** The path a page's share image is served from, without the origin. */
export const ogPath = (key: string) => `/og/${key}.png`;
