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
        return matchAll(html, /<title>([^<]+)<\/title>/giu)[0]?.trim();
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
    const expected = manifest.map((page) => `${ORIGIN}${page.route}`);

    expect(locations).toEqual(expected);
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

  it("keeps the converter entry and static fallback on the homepage", async () => {
    const html = await readFile(path.join(OUT_DIR, "index.html"), "utf8");
    const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/iu)?.[0] ?? "";
    const words = stripHtml(main).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/gu) ?? [];
    expect(html).toContain('id="app"');
    expect(html).toContain("Sprite to Aseprite Converter");
    expect(html).toMatch(/<script[^>]+src="\/assets\//u);
    expect(html).toContain("Artwork is parsed and converted in your browser.");
    expect(html).toContain("A practical guide to rebuilding sprite projects");
    expect(html).toContain("No blanket lossless claim is made");
    expect(matchAll(main, /<h2\b[^>]*>([\s\S]*?)<\/h2>/giu).length)
      .toBeGreaterThan(0);
    expect(words.length).toBeGreaterThan(650);
  });

  it("does not publish private artwork payloads or fake ad units", async () => {
    for (const page of manifest) {
      const html = await readBuiltPage(page);
      expect(html).not.toMatch(
        /data:image\/(?:png|gif|jpeg);base64,[A-Za-z0-9+/]{64}/iu,
      );
      expect(html).not.toMatch(/<img\b/iu);
      expect(html).not.toMatch(/adsbygoogle|data-ad-(?:client|slot)|pagead2\.googlesyndication/iu);
      expect(html).not.toMatch(/ad[-_ ]placeholder|click (?:an|the) ad/iu);
    }
  });
});
