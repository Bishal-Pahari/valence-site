import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';

import { DESCRIPTION, DOCS_REPO, GA_ID, REPO, SITE_URL } from './src/site.config.mjs';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    starlight({
      title: 'Valence',
      description: DESCRIPTION,
      logo: { src: './src/assets/logo.svg', alt: 'Valence' },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: REPO }],
      editLink: { baseUrl: `${DOCS_REPO}/edit/main/` },
      lastUpdated: true,
      // The marketing site has its own branded 404 (src/pages/404.astro).
      disable404Route: true,
      customCss: ['./src/styles/docs.css'],
      routeMiddleware: './src/route-middleware.ts',
      components: { Footer: './src/components/DocsFooter.astro' },
      head: [
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=Reddit+Mono:wght@400;500;600&display=swap',
          },
        },
        { tag: 'script', attrs: { src: '/consent.js', defer: true, 'data-ga': GA_ID } },
      ],
      sidebar: [
        { label: 'Getting started', items: ['docs/getting-started/quick-start', 'docs/getting-started/concepts'] },
        {
          label: 'Guides',
          items: [
            'docs/guides/web-app',
            'docs/guides/bridge',
            'docs/guides/host',
            'docs/guides/data-and-sync',
            'docs/guides/releasing',
            'docs/guides/store-policy',
          ],
        },
        {
          label: 'Reference',
          items: [
            'docs/reference/cli',
            'docs/reference/config',
            'docs/reference/manifest',
            'docs/reference/update-protocol',
            'docs/reference/bridge-protocol',
            'docs/reference/troubleshooting',
          ],
        },
      ],
    }),
    sitemap({ filter: (page) => !page.includes('/404') }),
  ],
});
