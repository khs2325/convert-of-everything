import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PALETTE = ["#4e1f6e", "#3e3e75", "#45a9a9", "#98e8de"] as const;

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16) / 255,
  ).map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("site color theme", () => {
  it("shares the selected Color Hunt palette across both site shells", async () => {
    const files = await Promise.all([
      readFile(path.join(ROOT, "index.html"), "utf8"),
      readFile(path.join(ROOT, "src", "styles.css"), "utf8"),
      readFile(path.join(ROOT, "public", "assets", "content.css"), "utf8"),
    ]);

    for (const file of files) {
      const css = file.toLowerCase();
      for (const color of PALETTE) expect(css).toContain(color);
    }
  });

  it("keeps the primary text and action color pairs accessible", () => {
    expect(contrast("#98e8de", "#4e1f6e")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#98e8de", "#3e3e75")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#45a9a9", "#160c23")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#f7fffe", "#292653")).toBeGreaterThanOrEqual(4.5);
  });

  it("ships the palette-matched social preview at its declared dimensions", async () => {
    const image = await readFile(path.join(ROOT, "public", "og.png"));

    expect([...image.subarray(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(image.readUInt32BE(16)).toBe(1536);
    expect(image.readUInt32BE(20)).toBe(1024);
  });
});
