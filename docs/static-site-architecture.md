# Static multi-page site architecture

The production site is a Vite multi-page static build. `/` remains the
JavaScript converter. Guides, articles, troubleshooting, and policy resources
are authored in repository-local data and generated as real HTML entry points
before development, tests, and production builds.

No server framework, CMS, database, upload endpoint, or application backend is
required. Cloudflare Pages publishes the contents of `dist/` as ordinary
static files. Artwork conversion remains browser-local.

## Source layout

- `index.html` is the converter entry and contains a useful static fallback for
  crawlers and browsers before the converter JavaScript runs.
- `site/page-manifest.json` is the canonical list of public indexable routes,
  titles, descriptions, H1 headings, and page kinds.
- `site/page-content.mjs` contains the distinct authored body content for every
  non-converter route.
- `site/render-page.mjs` owns the shared HTML shell, primary navigation,
  breadcrumbs, canonical links, and policy footer.
- `public/assets/content.css` is the shared long-form content stylesheet.
- `scripts/generate-site.mjs` renders route `index.html` files and derives both
  sitemap formats from the manifest.
- `vite.config.ts` reads the same manifest to register every HTML entry with
  Vite.

Generated source entry directories such as `guides/`, `articles/`, `privacy/`,
and `terms/` are ignored by Git. They are build inputs, not authored sources.
`dist/` is also generated and must not be edited or committed.

## Add a content page

1. Confirm that the page solves a distinct user need not already handled by an
   existing page. Do not add keyword-swapped, repetitive, or doorway content.
2. Add one manifest record with a unique trailing-slash route, title,
   description, H1, eyebrow, and appropriate page kind.
3. Add one matching `PAGE_CONTENT` entry. Start body structure at H2 because the
   shared renderer owns the single H1.
4. Add natural internal links from the relevant hub or related resource.
5. Run `npm run site:generate` while editing if the generated HTML needs direct
   inspection.
6. Run the full required verification commands.

The generator fails when a manifest page has no authored content. Production
tests also compare the built routes, titles, canonicals, links, and sitemap, so
a new public route is less likely to be omitted from discovery.

## Content quality rules

Public pages should derive technical behavior from importer/exporter code,
tests, synthetic fixtures, or maintained project documentation. State
uncertainty and version boundaries explicitly. Do not invent compatibility,
users, testimonials, benchmarks, affiliations, statistics, qualifications, or
approval claims.

Flat PNG, spritesheet, GIF, and APNG inputs rebuild rendered frames; they do
not recover original editor layers. Say that layers are preserved only when a
supported source format contains supported layer data.

Examples must be synthetic. Never add a user's genuine project file, embedded
pixel payload, or private artwork to a page or fixture.

## Build and preview

The package lifecycle runs the generator before `dev`, `test`, and `build`:

```bash
npm run typecheck
npm run test
npm run build
npm exec -- vite preview
```

Vite emits directory-index paths such as
`dist/guides/pixilart-to-aseprite/index.html`. A static host should preserve
that directory structure and serve `index.html` for directory requests. A
single-page-app catch-all rewrite is not required and can hide missing pages.

## Legacy hash links

The homepage keeps `#converter` and `#support` as local interaction targets.
An inline compatibility map redirects former content hashes such as
`#privacy-policy`, `#format-guides`, and `#about` to their real pages. Normal
navigation uses ordinary links and browser history.
