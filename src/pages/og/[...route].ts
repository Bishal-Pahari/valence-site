import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

import { OG_BG, OG_LOGO, OG_FONTS, OG_BANNER, MARKETING_OG } from '../../og';

const docs = await getCollection('docs');

const pages: Record<string, { title: string; description: string }> = { ...MARKETING_OG };
for (const entry of docs) {
  pages[entry.id] = { title: entry.data.title, description: entry.data.description ?? '' };
}

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'route',
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [OG_BG],
    bgImage: { path: OG_BANNER, fit: 'cover' },
    // The banner is drawn over the border, so this border is invisible. It only reserves the right side
    // for the artwork: text wraps before x ≈ 640 instead of running over the crab.
    border: { color: OG_BG, width: 430, side: 'inline-end' },
    padding: 64,
    logo: { path: OG_LOGO, size: [72] },
    font: {
      title: { families: ['Google Sans'], weight: 'Bold', size: 58, lineHeight: 1.12, color: [16, 18, 21] },
      description: { families: ['Google Sans'], weight: 'Medium', size: 26, lineHeight: 1.4, color: [103, 107, 114] },
    },
    fonts: OG_FONTS,
  }),
});
