# AdSense review checklist

Use this checklist after deploying the multi-page static build and before the
next AdSense review. Passing it improves readiness but does not guarantee
approval.

## Product and content

- [ ] `/` immediately explains the converter and keeps the conversion controls
  easy to reach.
- [ ] Guides answer distinct source-format tasks rather than repeating one
  keyword-swapped article.
- [ ] Technical claims match importers, exporters, tests, synthetic fixtures,
  and maintained format notes.
- [ ] Flat PNG, spritesheet, GIF, and APNG inputs are described as rendered
  frame sources, not recoverable layer sources.
- [ ] Layer wording is conditional on supported layer data in the source.
- [ ] No page claims perfect, lossless, universal, or guaranteed conversion.
- [ ] No fake reviews, users, statistics, benchmarks, company history,
  partnerships, endorsements, or qualifications appear.
- [ ] The site has no visible “under construction” or placeholder content.
- [ ] `/compatibility-lab/` exposes downloadable original synthetic inputs,
  observed output facts, preservation limits, and links to reproducible tests.

## Routes and crawlability

- [ ] The homepage initial HTML contains the conversion guide, workflow, and
  FAQ before JavaScript mounts the interactive converter.
- [ ] Every route in `site/page-manifest.json` returns `200` on a direct request
  and after refresh.
- [ ] `/guides/`, `/articles/`, `/troubleshooting/`, `/about/`, `/privacy/`,
  and `/terms/` are reachable through ordinary navigation.
- [ ] Each indexable page has one useful H1, a unique title, a unique matching
  canonical, and a distinct description.
- [ ] Long-form text appears directly in built HTML without converter
  JavaScript execution.
- [ ] `sitemap.xml` contains every intended indexable route and no missing
  route; `robots.txt` points to it.
- [ ] An arbitrary unknown production path returns the branded `404.html` with
  HTTP 404, `noindex`, and no homepage canonical.
- [ ] `/ads.txt` returns `text/plain` with the publisher record from the
  AdSense account instead of returning homepage HTML.
- [ ] Former content hashes redirect to the corresponding real page while
  `#converter` and `#support` remain local homepage targets.

## Trust and policy

- [ ] About identifies the open-source project and public maintainer without
  inventing a company, staff, users, or endorsements.
- [ ] Contact guidance provides a real public repository path and warns against
  sharing private artwork.
- [ ] Public evidence identifies its maintainer and real review date without
  inventing credentials, users, or affiliations.
- [ ] Privacy distinguishes local artwork processing from Cloudflare static
  resource requests and external links.
- [ ] Privacy accurately reflects the deployed status of ads, analytics,
  tracking, error reporting, and payments.
- [ ] Terms avoid guarantees of availability, compatibility, or recovery.
- [ ] Optional support remains voluntary and unlocks no hidden functionality.

## Deployment and browser-local processing

- [ ] Deploy only `dist/`; do not publish source, tests, fixtures, environment
  files, or user artwork.
- [ ] Nested directory-index routes work on Cloudflare Pages without a
  single-page-app catch-all.
- [ ] A small synthetic conversion completes and downloads in production.
- [ ] The Network panel shows no request containing selected source bytes,
  embedded source metadata, or generated Aseprite bytes during conversion.
- [ ] No upload endpoint, server conversion, cloud artwork storage, or remote
  image-processing fallback is active.

## Advertising safety

- [ ] The configured AdSense verification metadata is still valid.
- [ ] No live AdSense script or ad unit is described as active unless it is
  actually deployed and the privacy policy has been reviewed.
- [ ] No fake ad, placeholder, simulated unit, click prompt, fake traffic, or
  misleading sponsored content exists.
- [ ] Any future ad remains visually and structurally separate from selection,
  conversion, errors, downloads, private-file data, and support links.

## Verification

- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Representative files under `dist/guides/` and `dist/articles/` contain
  their full article text.
- [ ] The production preview and deployed Cloudflare Pages routes work with
  direct navigation, internal links, Back, and refresh.
