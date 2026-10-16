# valence-site

The website and developer documentation for [Valence](https://github.com/Bishal-Pahari/valence). It lives in its own repo because it changes for different reasons than the code.

- **Marketing site:** `/` (with a live release console), `/privacy/`, and a custom 404.
- **Developer docs:** `/docs/`, built with [Starlight](https://starlight.astro.build/). Source: `src/content/docs/docs/`.
- **For machines:** `sitemap-index.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`, JSON-LD (`SoftwareApplication`, `FAQPage`, `TechArticle`), and a generated 1200×630 share image for every page.

Astro 7, Starlight, no CSS framework. Node 22.13 or later.

## Commands

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # builds dist/ and then runs the SEO check
npm run preview    # serves dist/
npm run check      # only the SEO check, against an existing dist/
```

`npm run build` **fails** when a page has a missing or duplicate title or description, no canonical or share image, an `<img>` without alt text, a broken internal link or anchor, a page nothing links to, or a missing sitemap, `robots.txt`, `llms.txt` or 404 page. The rules are in `scripts/check-seo.mjs`.

## Configuration

Two environment variables, set at build time (see `.env.example`):

| Variable | Meaning |
|---|---|
| `SITE_URL` | The public origin, no trailing slash. Used for canonical URLs, the sitemap, `robots.txt` and share images. Until a domain is bought it defaults to the free Cloudflare Pages address `https://getvalence.pages.dev`. |
| `PUBLIC_GA_ID` | A GA4 measurement ID such as `G-XXXXXXXXXX`. Empty means no analytics code, no banner, and a privacy page that says so. |

## Before the first deploy

Things that need an account, a domain or a host, so they cannot be done from the repo:

1. **Pick a host that serves HTTPS** and set `SITE_URL` to the `https://` origin. Redirect HTTP to HTTPS and send `Strict-Transport-Security` at the host (Cloudflare Pages, Netlify and Vercel all do the first by default; headers go in `public/_headers` or the host's config).
2. **Google Analytics (optional).** Create a GA4 property, set `PUBLIC_GA_ID`, deploy, accept the banner, and confirm your visit under Reports → Realtime. Analytics only loads after consent, so a visit where you decline will not appear.
3. **Search Console.** Add the site as a property, verify ownership (DNS record or the HTML meta tag), then submit `https://<your domain>/sitemap-index.xml` under Sitemaps.
4. **Check a share image** by pasting a page URL into a link-preview tool after deploying.
5. **Fill in the privacy policy.** Set `CONTACT_EMAIL` in `src/site.config.mjs` (until then the page points to the issue tracker). Add the host's name and how long it keeps server logs to `src/pages/privacy.astro`. If you turn on analytics, leave GA4 data retention at 2 months (Admin → Data collection → Data retention), because the policy says so. Then have it reviewed for your jurisdiction.

## Where things are

```
src/content/docs/docs/    developer docs (Markdown), grouped into getting-started, guides, reference
src/content/home.html     the home page body (also the source of the FAQ structured data)
src/pages/                home, privacy, 404, share-image route, robots.txt, llms.txt, llms-full.txt
src/layouts/Base.astro    shared <head>, nav and footer for the marketing pages
src/styles/               base.css (shared tokens), home.css, docs.css (Starlight theme)
src/scripts/home.js       the release console
public/consent.js         analytics consent banner (does nothing without a GA ID)
public/assets/            logo, mascot poses, phone frame
public/fonts/             self-hosted web fonts and fonts.css
src/fonts/                TTFs used only to draw share images
brand/                    original logo and mascot sheets
scripts/check-seo.mjs     the build-time SEO check
```

## Keeping the docs true

The docs restate the Valence spec (`contracts.md` in the code repo) in a friendlier order, and the release console on the home page models its update algorithm. When behaviour changes in the code repo, update the matching docs page here in the same sitting. The pages name the spec section they come from.

## Notes

- **Fonts:** Google Sans and Reddit Mono are self-hosted from `public/fonts/` (the latin, latin-ext and symbols subsets, downloaded from Google Fonts), so visitors never contact Google. The TTFs in `src/fonts/` are only used to render share images at build time. Both families are under the SIL Open Font License; `OFL.txt` sits next to the files.
- **`npm audit`** reports moderate advisories in build-time dependencies of Starlight (PostCSS selector parsing). They matter when parsing untrusted CSS, which this site does not do. Its suggested fix is a downgrade, so it is not applied; update Starlight when a release addresses them.
- **Images on the home page** are plain `<img>` tags in `home.html` with explicit sizes and alt text. The mascot files are already small WebP.

## License

MIT, see `LICENSE`. It covers the code and the docs. It does not grant any right to the Valence name, logo or mascot (`brand/`, `public/assets/`): those are © 2026 Bishal Pahari, all rights reserved. The fonts are under the SIL Open Font License, see `src/fonts/OFL.txt`.
