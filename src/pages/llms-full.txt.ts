import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

import { SITE_NAME, SITE_URL } from '../site.config.mjs';

// The whole documentation as one Markdown file, so an assistant can read it in a single request.
export const GET: APIRoute = async () => {
  const docs = (await getCollection('docs'))
    .filter((d) => d.filePath?.endsWith('.md'))
    .sort((a, b) => a.id.localeCompare(b.id));

  const body = [
    `# ${SITE_NAME} documentation`,
    '',
    ...docs.flatMap((d) => [
      `# ${d.data.title}`,
      `Source: ${SITE_URL}/${d.id}/`,
      '',
      (d.body ?? '').trim(),
      '',
      '---',
      '',
    ]),
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
