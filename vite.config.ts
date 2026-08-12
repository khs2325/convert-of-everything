import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import pages from "./site/page-manifest.json";

const root = path.dirname(fileURLToPath(import.meta.url));
const input = Object.fromEntries(
  pages.map((page) => {
    const file = page.route === "/"
      ? "index.html"
      : path.join(page.route.slice(1), "index.html");
    const name = page.route === "/"
      ? "home"
      : page.route.replaceAll("/", "-").replace(/^-|-$/gu, "");
    return [name, path.resolve(root, file)];
  }),
);

export default defineConfig({
  build: {
    rollupOptions: { input },
    target: "es2022",
  }
});
