import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PAGE_CONTENT } from "../site/page-content.mjs";
import { ORIGIN, renderPage } from "../site/render-page.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(ROOT, "site", "page-manifest.json"), "utf8"));

function routeFile(route) {
  if (route === "/") return path.join(ROOT, "index.html");
  return path.join(ROOT, route.slice(1), "index.html");
}

export async function generateSite() {
  const contentPages = manifest.filter((page) => page.kind !== "converter");
  for (const page of contentPages) {
    const content = PAGE_CONTENT[page.route];
    if (typeof content !== "string" || content.trim().length === 0) throw new Error(`Missing authored content for ${page.route}`);
    const output = routeFile(page.route);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, renderPage(page, content), "utf8");
  }

  const urls = manifest.map((page) => `${ORIGIN}${page.route}`);
  const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls.map((url) => `  <url><loc>${url}</loc></url>`), "</urlset>", ""].join("\n");
  await writeFile(path.join(ROOT, "public", "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(ROOT, "public", "sitemap.txt"), `${urls.join("\n")}\n`, "utf8");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await generateSite();
