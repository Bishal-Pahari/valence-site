import type { APIRoute } from 'astro';

import { SITE_URL } from '../site.config.mjs';

// Everything is public, and AI search crawlers are welcome: the docs are meant to be quoted.
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      '# AI and answer-engine crawlers',
      ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended'].flatMap((bot) => [
        `User-agent: ${bot}`,
        'Allow: /',
        '',
      ]),
      `Sitemap: ${SITE_URL}/sitemap-index.xml`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
