# AdSense readiness

Sprite Converter has a crawlable multi-page content architecture
surrounding the browser-local converter. This improves independent page value,
technical transparency, navigation, and review readiness. It does not
guarantee AdSense approval.

Indexable pages contain the configured Google AdSense account-verification meta
tag, and the root `ads.txt` identifies the same publisher. The current
repository does not load a live AdSense script, render an ad
unit, add analytics or conversion telemetry, display fake ads, or provide a
conversion backend.

The homepage also includes substantial project-specific guidance directly in
its initial HTML. Visitors and crawlers can understand source-format choices,
browser-local processing, verification steps, and conversion limits before
the interactive converter JavaScript runs. The mounted application retains
equivalent guidance instead of replacing it with controls alone.

## Public architecture

`site/page-manifest.json` is the single indexable-page list. It drives Vite
multi-page inputs and both sitemaps. Each manifest entry carries an accurate
ISO `lastModified` date used by the XML sitemap and page structured data.
Long-form pages are generated as real
directory-index HTML, so their headings and prose are present without running
the converter application.

Before requesting review, deploy and directly refresh at least:

- `/`;
- `/guides/` and every linked detailed guide;
- `/articles/` and both technical articles;
- `/compatibility-lab/` and its downloadable synthetic samples;
- `/troubleshooting/`;
- `/about/`;
- `/privacy/`; and
- `/terms/`.

Every indexable page must have its own title, description, canonical URL, H1,
useful body, ordinary internal links, explicit crawl directives, authorship,
and parseable schema.org data. Automated production-build tests check these
properties and compare the sitemap with built files.

Search discovery is a separate release gate. A successful local build does not
prove that Google has discovered the deployment. After production is current,
confirm that `sitemap.xml` returns `200`, re-submit it in the verified Search
Console property, and monitor the sitemap and Page indexing reports. Request
indexing only for representative high-value URLs rather than repeatedly
submitting every page.

Cloudflare Pages must also return the top-level `404.html` with an HTTP 404 for
unknown paths. Without that file, Pages can treat this build as an SPA and
return the canonical homepage with `200` for arbitrary URLs. The 404 document
is `noindex`, is not in the sitemap, and contains no canonical URL.

## Content accuracy

Do not claim perfect, lossless, or universal conversion. PNG, spritesheet, GIF,
and APNG sources rebuild rendered frames but cannot recover original editor
layers. Say that layers are preserved only when a supported source format
contains supported layer data.

New content must solve a distinct user need and draw primarily from project
code, tests, synthetic fixtures, and maintained format notes. Do not add thin,
keyword-swapped, repetitive, or doorway pages. Do not invent testimonials,
statistics, affiliations, customers, qualifications, or compatibility claims.

The compatibility lab is the public evidence layer: every downloadable sample
is byte-identical to a deterministic repository fixture. It records observed
dimensions, frames, durations, layers, preservation limits, rejection
boundaries, maintainer, review date, and links to the generator and tests.

## Privacy boundary

Files are processed through browser APIs and are not uploaded to a project
server for conversion. Generated downloads are created locally. Keep that
promise distinct from:

- ordinary Cloudflare requests for public HTML, CSS, JavaScript, and assets;
- a visitor following an external GitHub or support link; and
- a visitor voluntarily attaching files to an issue, email, cloud drive, chat,
  or other external service.

## Future advertising placement

Do not add fake ads or placeholders merely to appear monetized. If live ads are
enabled later, review the deployed privacy policy and keep advertising clearly
outside:

- file picker and drag-and-drop regions;
- selected or private file information;
- conversion and download controls;
- status and error messages; and
- support buttons or provider links.

Ads must never resemble a converter action or encourage clicks. Re-run the
DOM and built-HTML safety tests after any advertising change.

Before live AdSense ad requests are enabled, configure a Google-certified
consent management platform for visitors in the EEA, United Kingdom, and
Switzerland. The deployed privacy policy must link to Google's explanation of
partner-site data use and describe the actual advertising and consent behavior.
Do not display a consent banner that implies advertising cookies are active
while the site contains verification metadata only.
