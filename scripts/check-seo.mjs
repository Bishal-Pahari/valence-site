// Runs after `astro build` and fails the build when a page breaks the SEO checklist.
// Zero dependencies: it reads dist/ with regular expressions, which is enough for HTML that Astro generates.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = process.env.DIST || 'dist';
const SITE_URL = (process.env.SITE_URL || 'https://valence.example').replace(/\/$/, '');
const errors = [];
const warnings = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);

if (!existsSync(DIST)) {
  console.error('check-seo: dist/ not found. Run `astro build` first.');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const rel = (f) => relative(DIST, f).split('\\').join('/');
const urlOf = (f) => '/' + rel(f).replace(/(^|\/)index\.html$/, '$1').replace(/^404\.html$/, '404/');

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))?.[2] ?? tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))?.[3];
const metas = (html) => [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
const meta = (html, key) => {
  const tag = metas(html).find((t) => attr(t, 'name') === key || attr(t, 'property') === key);
  return tag ? attr(tag, 'content') : undefined;
};

const pages = new Map();
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  if (/<meta[^>]+http-equiv=["']refresh["']/i.test(html)) continue; // Astro redirect stubs
  pages.set(urlOf(f), { file: f, html, name: rel(f) });
}

const idsOf = (html) => new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]));
const titles = new Map();
const descriptions = new Map();
const inbound = new Map([...pages.keys()].map((u) => [u, 0]));

for (const [url, { html, name }] of pages) {
  const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);

  // Title and description: present and unique.
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) err(name, 'missing <title>');
  else if (titles.has(title)) err(name, `duplicate title "${title}" (also ${titles.get(title)})`);
  else titles.set(title, name);

  const description = meta(html, 'description');
  if (!description) err(name, 'missing meta description');
  else {
    if (descriptions.has(description)) err(name, `duplicate meta description (also ${descriptions.get(description)})`);
    else descriptions.set(description, name);
    if (description.length < 50 || description.length > 170) warnings.push(`${name}: description is ${description.length} characters (aim for 50-170)`);
  }
  if (title && title.length > 70) warnings.push(`${name}: title is ${title.length} characters (aim for 60 or fewer)`);

  // Canonical and social tags.
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
  if (!canonical) err(name, 'missing canonical link');
  else if (!/^https:\/\//.test(attr(canonical, 'href') ?? '')) err(name, 'canonical is not an absolute https URL');

  for (const key of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:image']) {
    if (!meta(html, key)) err(name, `missing <meta ${key}>`);
  }
  const og = meta(html, 'og:image');
  if (og) {
    const path = og.startsWith(SITE_URL) ? og.slice(SITE_URL.length) : null;
    if (path === null) err(name, `og:image is not on ${SITE_URL}: ${og}`);
    else if (!existsSync(join(DIST, path))) err(name, `og:image file is missing from the build: ${path}`);
  }

  // One h1.
  const h1s = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1s !== 1 && !noindex) err(name, `expected exactly one <h1>, found ${h1s}`);

  // Images: alt text, unless decorative.
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const alt = attr(tag, 'alt');
    const decorative = /aria-hidden=["']true["']|role=["']presentation["']/i.test(tag);
    if (alt === undefined) err(name, `<img> without alt: ${tag.slice(0, 90)}`);
    else if (alt.trim() === '' && !decorative) err(name, `<img> with empty alt that is not marked decorative: ${tag.slice(0, 90)}`);
  }

  // Internal links resolve, and their anchors exist.
  for (const m of html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const [pathAndQuery, hash] = href.split('#');
    const path = pathAndQuery.split('?')[0] || url;
    const target = pages.get(path.endsWith('/') ? path : path + '/') ?? pages.get(path);
    if (!target) {
      if (!existsSync(join(DIST, path)) && !existsSync(join(DIST, path.replace(/\/$/, ''), 'index.html'))) err(name, `broken internal link: ${href}`);
      continue;
    }
    const targetUrl = pages.has(path) ? path : path + '/';
    if (targetUrl !== url) inbound.set(targetUrl, (inbound.get(targetUrl) ?? 0) + 1);
    if (hash && !idsOf(target.html).has(decodeURIComponent(hash))) err(name, `link to ${href}: no element with id "${hash}" on ${targetUrl}`);
  }
}

// Every indexable page is linked from at least one other page.
for (const [url, count] of inbound) {
  const { html, name } = pages.get(url);
  if (count === 0 && url !== '/' && !/noindex/i.test(html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? '')) err(name, 'no other page links to this page (orphan)');
}

// Site-wide files.
if (!existsSync(join(DIST, '404.html'))) err('404.html', 'custom 404 page was not generated');
const robots = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
if (!robots) err('robots.txt', 'missing');
else if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap-index.xml`)) err('robots.txt', 'does not point at the sitemap');
if (!existsSync(join(DIST, 'sitemap-index.xml'))) err('sitemap-index.xml', 'missing');
else {
  const urls = files
    .filter((f) => /sitemap-\d+\.xml$/.test(f))
    .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  for (const [url, { html, name }] of pages) {
    const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
    const listed = urls.includes(SITE_URL + url);
    if (!noindex && !listed) err(name, `not in the sitemap: ${SITE_URL + url}`);
    if (noindex && listed) err(name, 'is noindex but listed in the sitemap');
  }
}
for (const f of ['llms.txt', 'llms-full.txt']) if (!existsSync(join(DIST, f))) err(f, 'missing');

if (SITE_URL === 'https://valence.example') warnings.push('SITE_URL is the placeholder https://valence.example. Set SITE_URL before deploying so canonicals, the sitemap and share images use your domain.');

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  console.error(`\ncheck-seo: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`check-seo: ${pages.size} pages OK (titles, descriptions, canonicals, share images, alt text, links, anchors, sitemap, robots, 404)`);
