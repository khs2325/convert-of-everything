const ORIGIN = "https://sprite-to-aseprite.pages.dev";

const NAVIGATION = [
  ["Converter", "/"],
  ["Guides", "/guides/"],
  ["Test lab", "/compatibility-lab/"],
  ["Articles", "/articles/"],
  ["Troubleshooting", "/troubleshooting/"],
  ["About", "/about/"],
];

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function navigation(route) {
  return NAVIGATION.map(([label, href]) => {
    const current = route === href || (href !== "/" && route.startsWith(href));
    return `<a href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a>`;
  }).join("");
}

function breadcrumb(page) {
  if (page.kind !== "guide" && page.kind !== "article") return "";
  const parentHref = page.kind === "guide" ? "/guides/" : "/articles/";
  const parentLabel = page.kind === "guide" ? "Guides" : "Articles";
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Converter</a><span aria-hidden="true">/</span><a href="${parentHref}">${parentLabel}</a></nav>`;
}

export function renderPage(page, content) {
  const canonical = `${ORIGIN}${page.route}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <meta name="google-adsense-account" content="ca-pub-7611560030784765">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Convert of Everything">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${ORIGIN}/og.png">
    <meta property="og:image:width" content="1730">
    <meta property="og:image:height" content="909">
    <meta property="og:image:alt" content="Convert of Everything browser-local sprite conversion preview">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="twitter:image" content="${ORIGIN}/og.png">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/assets/content.css">
  </head>
  <body>
    <a class="skip-link" href="#content">Skip to content</a>
    <header class="page-header">
      <a class="brand" href="/" aria-label="Convert of Everything home"><span aria-hidden="true">C↔E</span><strong>Convert of Everything</strong></a>
      <nav class="primary-nav" aria-label="Primary navigation">${navigation(page.route)}</nav>
    </header>
    <main id="content" class="reading-shell">
      ${breadcrumb(page)}
      <article class="article">
        <header class="article-header">
          <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
          <h1>${escapeHtml(page.h1)}</h1>
          <p class="dek">${escapeHtml(page.description)}</p>
          ${page.lastReviewed ? `<p class="review-note">Maintained by <a href="https://github.com/khs2325">khs2325</a> · Last reviewed ${escapeHtml(page.lastReviewed)}</p>` : ""}
        </header>
        ${content}
      </article>
    </main>
    <footer class="page-footer">
      <p>Independent open-source project · MIT licensed · Not affiliated with Aseprite.</p>
      <nav aria-label="Policy links"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/khs2325/convert-of-everything/issues">Contact</a><a href="https://github.com/khs2325/convert-of-everything">Source &amp; tests</a></nav>
    </footer>
  </body>
</html>`;
}

export { ORIGIN };
