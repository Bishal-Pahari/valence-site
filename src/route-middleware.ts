// Runs for every docs page: adds the beta banner, the share image and article structured data.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

import { AUTHOR, BETA_BANNER, SITE_NAME, SITE_URL } from './site.config.mjs';
import { ogPath } from './og';

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const { title, description } = route.entry.data;
  // A page's own banner (frontmatter) wins; the beta page itself doesn't need one.
  if (!route.entry.data.banner && route.entry.id !== 'docs/getting-started/beta') route.entry.data.banner = { content: BETA_BANNER };
  const image = `${SITE_URL}${ogPath(route.entry.id)}`;
  const url = new URL(context.url.pathname, SITE_URL).href;

  route.head.push(
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: `${title}: ${SITE_NAME} documentation` } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
    {
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      content: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        description,
        url,
        inLanguage: 'en',
        image,
        author: { '@type': 'Person', name: AUTHOR },
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
        dateModified: route.lastUpdated?.toISOString(),
      }),
    },
  );
});
