import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

import { MARKETING_OG, OG_FONTS, OG_LOGO } from '../../og';

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
    bgGradient: [[250, 250, 251]],
    border: { color: [47, 107, 176], width: 24, side: 'inline-start' },
    padding: 72,
    logo: { path: OG_LOGO, size: [84] },
    font: {
      title: { families: ['Google Sans'], weight: 'Bold', size: 70, lineHeight: 1.12, color: [16, 18, 21] },
      description: { families: ['Google Sans'], weight: 'Medium', size: 32, lineHeight: 1.35, color: [103, 107, 114] },
    },
    fonts: OG_FONTS,
  }),
});
