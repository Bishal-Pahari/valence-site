import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

import { DESCRIPTION, SITE_NAME, SITE_URL } from '../site.config.mjs';

// llms.txt: a short, linked map of the docs for AI assistants (https://llmstxt.org).
export const GET: APIRoute = async () => {
  const docs = (await getCollection('docs')).sort((a, b) => a.id.localeCompare(b.id));
  const section = (prefix: string) =>
    docs
      .filter((d) => d.id.startsWith(prefix))
      .map((d) => `- [${d.data.title}](${SITE_URL}/${d.id.replace(/\/index$/, '')}/): ${d.data.description ?? ''}`);

  const body = [
    `# ${SITE_NAME}`,
    '',
    `> ${DESCRIPTION}`,
    '',
    'Valence runs a web app inside a Flutter shell. UI changes ship as signed bundles that phones verify, trial and roll back on their own; data lives in native SQLite and syncs by sequence number. Open source, MIT.',
    '',
    '## Getting started',
    ...section('docs/getting-started/'),
    '',
    '## Guides',
    ...section('docs/guides/'),
    '',
    '## Reference',
    ...section('docs/reference/'),
    '',
    '## Optional',
    `- [Full documentation as one text file](${SITE_URL}/llms-full.txt)`,
    `- [Privacy policy](${SITE_URL}/privacy/)`,
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
