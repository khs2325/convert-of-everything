import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "vite";

import manifest from "../../site/page-manifest.json";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const ORIGIN = "https://sprite-to-aseprite.pages.dev";
const OUT_DIR = path.join(ROOT, "tmp", `static-site-pages-${process.pid}`);

type Page = (typeof manifest)[number];

function routeFile(root: string, route: string): string {
  return route === "/"
    ? path.join(root, "index.html")
    : path.join(root, route.slice(1), "index.html");
}

function matchAll(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

async function readBuiltPage(page: Page): Promise<string> {
  return readFile(routeFile(OUT_DIR, page.route), "utf8");
}

beforeAll(async () => {
  await execFileAsync(process.execPath, ["scripts/generate-site.mjs"], {
    cwd: ROOT,
  });
  await build({
    build: { outDir: OUT_DIR },
    logLevel: "silent",
  });
}, 60_000);

afterAll(async () => {
  await rm(OUT_DIR, { force: true, recursive: true });
});

describe("static multi-page site", () => {
  it("emits every intended public route as an HTML file", async () => {
    await expect(
      Promise.all(manifest.map((page) => readBuiltPage(page))),
    ).resolves.toHaveLength(manifest.length);
  });

  it("gives every page a non-empty unique title", async () => {
    const titles = await Promise.all(
      manifest.map(async (page) => {
        const html = await readBuiltPage(page);
        const title = matchAll(html, /<title>([^<]+)<\/title>/giu)[0]?.trim();
        expect(title).toBe(page.title);
        return title;
      }),
    );

    expect(titles.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("uses one unique canonical matching each page path", async () => {
    const canonicals = await Promise.all(
      manifest.map(async (page) => {
        const html = await readBuiltPage(page);
        const values = matchAll(
          html,
          /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?\s*>/giu,
        );
        expect(values).toEqual([`${ORIGIN}${page.route}`]);
        return values[0];
      }),
    );

    expect(new Set(canonicals).size).toBe(canonicals.length);
  });

  it("publishes the verified AdSense account marker on every indexable page", async () => {
    for (const page of manifest) {
      const html = await readBuiltPage(page);
      expect(matchAll(
        html,
        /<meta\s+name="google-adsense-account"\s+content="([^"]+)"\s*\/?\s*>/giu,
      )).toEqual(["ca-pub-7611560030784765"]);
    }
  });

  it("uses the Sprite Converter brand consistently on every indexable page", async () => {
    for (const page of manifest) {
      const html = await readBuiltPage(page);
      expect(html).toContain("Sprite Converter");
      expect(html).not.toContain("Convert of Everything");
      expect(html).not.toContain("C↔E");
    }
  });

  it("publishes crawl directives, authorship, and parseable structured data", async () => {
    for (const page of manifest) {
      const html = await readBuiltPage(page);
      expect(html).toContain('<meta name="author" content="khs2325"');
      expect(html).toContain(
        '<meta name="robots" content="index, follow, max-image-preview:large"',
      );
      const json = matchAll(
        html,
        /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/giu,
      );
      expect(json).toHaveLength(1);
      const data = JSON.parse(json[0]) as {
        ["@context"]: string;
        author: { name: string };
        dateModified: string;
        description: string;
        url: string;
      };
      expect(data).toMatchObject({
        "@context": "https://schema.org",
        author: { name: "khs2325" },
        dateModified: page.lastModified,
        description: page.description,
        url: `${ORIGIN}${page.route}`,
      });
    }
  });

  it("puts meaningful headings and prose directly in built HTML", async () => {
    for (const page of manifest) {
      const html = await readBuiltPage(page);
      expect(matchAll(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/giu)).toHaveLength(1);
      expect(stripHtml(html)).toContain(page.description.split(" ").slice(0, 4).join(" "));
      if (page.kind !== "converter") {
        expect(matchAll(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/giu).length).toBeGreaterThan(0);
        expect(matchAll(html, /<p\b[^>]*>([\s\S]*?)<\/p>/giu).length).toBeGreaterThan(2);
      }
    }
  });

  it("keeps the sitemap exactly aligned with existing indexable routes", async () => {
    const sitemap = await readFile(path.join(OUT_DIR, "sitemap.xml"), "utf8");
    const locations = matchAll(sitemap, /<loc>([^<]+)<\/loc>/giu);
    const lastModified = matchAll(sitemap, /<lastmod>([^<]+)<\/lastmod>/giu);
    const expected = manifest.map((page) => `${ORIGIN}${page.route}`);

    expect(locations).toEqual(expected);
    expect(lastModified).toEqual(manifest.map((page) => page.lastModified));
    for (const location of locations) {
      const route = new URL(location).pathname;
      await expect(readFile(routeFile(OUT_DIR, route), "utf8")).resolves.toContain("<html");
    }
  });

  it("keeps internal navigation on real production pages", async () => {
    const routes = new Set(manifest.map((page) => page.route));
    for (const page of manifest) {
      const html = await readBuiltPage(page);
      const hrefs = matchAll(html, /<a\b[^>]*\shref="([^"]+)"[^>]*>/giu);
      for (const href of hrefs) {
        if (/^(?:https?:|mailto:|#)/u.test(href)) continue;
        const target = new URL(href, ORIGIN);
        if (target.pathname.startsWith("/samples/")) {
          await expect(readFile(path.join(OUT_DIR, target.pathname), "utf8"))
            .resolves.not.toHaveLength(0);
          continue;
        }
        expect(routes.has(target.pathname), `${page.route} links to missing ${href}`).toBe(true);
      }
    }
  });

  it("makes trust, policy, and help pages reachable through navigation", async () => {
    const required = ["/about/", "/privacy/", "/terms/", "/troubleshooting/"];
    for (const page of manifest.filter((entry) => entry.kind !== "converter")) {
      const html = await readBuiltPage(page);
      for (const route of required) expect(html).toContain(`href="${route}"`);
    }
  });

  it("publishes a substantial original conversion verification article", async () => {
    const html = await readBuiltPage({
      ...manifest.find((page) => page.route === "/articles/verify-sprite-conversion/")!,
    });
    const words = stripHtml(html).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/gu) ?? [];

    expect(words.length).toBeGreaterThan(850);
    expect(html).toContain("Separate visual equivalence from editability");
    expect(html).toContain("Test boundaries as well as success");
    expect(html).toContain('href="/compatibility-lab/"');
  });

  it("publishes a focused ReSprite to Aseprite search landing page", async () => {
    const page = manifest.find(
      (entry) => entry.route === "/guides/resprite-to-aseprite/",
    )!;
    const html = await readBuiltPage(page);
    const words = stripHtml(html).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/gu) ?? [];

    expect(html).toContain(
      "<title>ReSprite to Aseprite Converter: Frames and Layers | Sprite Converter</title>",
    );
    expect(html).toContain("Convert ReSprite to Aseprite in your browser");
    expect(html).toContain(
      '<link rel="canonical" href="https://sprite-to-aseprite.pages.dev/guides/resprite-to-aseprite/">',
    );
    expect(html).toContain("How to convert ReSprite to Aseprite");
    expect(html).toContain("What the supported importer preserves");
    expect(html).toContain("https://resprite.fengeon.com/docs/basic/export");
    expect(html).toContain('href="/#converter"');
    expect(words.length).toBeGreaterThan(750);
  });

  it("discloses possible Google advertising data use and consent prerequisites", async () => {
    const privacyPage = manifest.find((page) => page.route === "/privacy/")!;
    const html = await readBuiltPage(privacyPage);

    expect(html).toContain("https://policies.google.com/technologies/partner-sites");
    expect(html).toContain("Google-certified consent management platform");
    expect(html).toContain("does not make AdSense ad requests");
  });

  it("keeps the converter entry and static fallback on the homepage", async () => {
    const html = await readFile(path.join(OUT_DIR, "index.html"), "utf8");
    const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/iu)?.[0] ?? "";
    const words = stripHtml(main).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/gu) ?? [];
    expect(html).toContain('id="app"');
    expect(html).toContain("Sprite Converter");
    expect(html).toMatch(/<script[^>]+src="\/assets\//u);
    expect(html).toContain("Artwork is parsed and converted in your browser.");
    expect(html).toContain("A practical guide to rebuilding sprite projects");
    expect(html).toContain("No blanket lossless claim is made");
    expect(matchAll(main, /<h2\b[^>]*>([\s\S]*?)<\/h2>/giu).length)
      .toBeGreaterThan(0);
    expect(words.length).toBeGreaterThan(650);
  });

  it("publishes only repository-owned sample images and no fake ad units", async () => {
    for (const page of manifest) {
      const html = await readBuiltPage(page);
      expect(html).not.toMatch(
        /data:image\/(?:png|gif|jpeg);base64,[A-Za-z0-9+/]{64}/iu,
      );
      const imageSources = matchAll(html, /<img\b[^>]*\ssrc="([^"]+)"[^>]*>/giu);
      if (page.route === "/") {
        expect(imageSources).toEqual(["/samples/spark-sheet.png"]);
      } else if (page.route === "/compatibility-lab/") {
        expect(imageSources).toEqual([
          "/samples/spark-01.png",
          "/samples/spark-02.png",
          "/samples/spark-sheet.png",
          "/samples/timing-transparency-offsets.gif",
          "/samples/timing-offsets.apng",
        ]);
        expect(matchAll(html, /<figure\b/giu)).toHaveLength(5);
        expect(html).toContain("Last reviewed August 24, 2026");
      } else {
        expect(imageSources).toEqual([]);
      }
      expect(html).not.toMatch(/adsbygoogle|data-ad-(?:client|slot)|pagead2\.googlesyndication/iu);
      expect(html).not.toMatch(/ad[-_ ]placeholder|click (?:an|the) ad/iu);
    }
  });

  it("keeps every published sample byte-identical to its deterministic fixture", async () => {
    const sampleFixtures = new Map([
      ["spark-01.png", "png-sequence/spark-01.png"],
      ["spark-02.png", "png-sequence/spark-02.png"],
      ["spark-sheet.png", "spritesheet/spark-sheet.png"],
      ["spark-sheet.json", "spritesheet/spark-sheet.json"],
      ["multi-layer.piskel", "piskel/multi-layer.piskel"],
      ["timing-transparency-offsets.gif", "gif/timing-transparency-offsets.gif"],
      ["timing-offsets.apng", "apng/timing-offsets.apng"],
      ["two-layers-two-frames.pxo", "pixelorama/two-layers-two-frames.pxo"],
      ["two-layers-two-frames.pixil", "pixil/two-layers-two-frames.pixil"],
      ["two-layers.ora", "openraster/two-layers.ora"],
      ["two-paint-layers.kra", "krita/two-paint-layers.kra"],
      ["two-layers.psd", "psd/two-layers.psd"],
    ]);

    for (const [sample, fixture] of sampleFixtures) {
      const published = await readFile(path.join(OUT_DIR, "samples", sample));
      const source = await readFile(path.join(ROOT, "tests", "fixtures", fixture));
      expect(published.equals(source), `${sample} drifted from ${fixture}`).toBe(true);
    }
  });

  it("ships a crawlable ads.txt record and an explicit noindex 404 document", async () => {
    await expect(readFile(path.join(OUT_DIR, "ads.txt"), "utf8")).resolves.toBe(
      "google.com, pub-7611560030784765, DIRECT, f08c47fec0942fa0\n",
    );

    const notFound = await readFile(path.join(OUT_DIR, "404.html"), "utf8");
    expect(notFound).toContain('<meta name="robots" content="noindex, follow">');
    expect(notFound).toContain("This route does not exist");
    expect(notFound).not.toMatch(/rel="canonical"/iu);
  });
});
