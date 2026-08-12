# AdSense readiness

Sprite to Aseprite Converter has a crawlable multi-page content architecture
surrounding the browser-local converter. This improves independent page value,
technical transparency, navigation, and review readiness. It does not
guarantee AdSense approval.

The homepage contains the configured Google AdSense account-verification meta
tag. The current repository does not load a live AdSense script, render an ad
unit, add analytics or conversion telemetry, display fake ads, or provide a
conversion backend.

The homepage also includes substantial project-specific guidance directly in
its initial HTML. Visitors and crawlers can understand source-format choices,
browser-local processing, verification steps, and conversion limits before
the interactive converter JavaScript runs. The mounted application retains
equivalent guidance instead of replacing it with controls alone.

## Public architecture

`site/page-manifest.json` is the single indexable-page list. It drives Vite
multi-page inputs and both sitemaps. Long-form pages are generated as real
directory-index HTML, so their headings and prose are present without running
the converter application.

Before requesting review, deploy and directly refresh at least:

- `/`;
- `/guides/` and every linked detailed guide;
- `/articles/` and both technical articles;
- `/troubleshooting/`;
- `/about/`;
- `/privacy/`; and
- `/terms/`.

Every indexable page must have its own title, description, canonical URL, H1,
useful body, and ordinary internal links. Automated production-build tests
check these properties and compare the sitemap with built files.

## Content accuracy

Do not claim perfect, lossless, or universal conversion. PNG, spritesheet, GIF,
and APNG sources rebuild rendered frames but cannot recover original editor
layers. Say that layers are preserved only when a supported source format
contains supported layer data.

New content must solve a distinct user need and draw primarily from project
code, tests, synthetic fixtures, and maintained format notes. Do not add thin,
keyword-swapped, repetitive, or doorway pages. Do not invent testimonials,
statistics, affiliations, customers, qualifications, or compatibility claims.

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
