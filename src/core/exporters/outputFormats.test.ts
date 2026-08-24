import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import type { SpriteProject } from "../SpriteProject";
import { exportPngSequence } from "./pngSequence";
import { exportSpritesheet } from "./spritesheet";

function project(): SpriteProject {
  return {
    colorMode: "rgba",
    frameTags: [{ name: "walk", from: 0, to: 1, direction: "ping-pong" }],
    frames: [{ index: 0, durationMs: 80 }, { index: 1, durationMs: 120 }],
    height: 1,
    layers: [{
      id: "base",
      name: "Base",
      opacity: 255,
      visible: true,
      cels: [
        { frameIndex: 0, x: 0, y: 0, imageData: { colorSpace: "srgb", data: new Uint8ClampedArray([255, 0, 0, 255]), height: 1, width: 1 } },
        { frameIndex: 1, x: 0, y: 0, imageData: { colorSpace: "srgb", data: new Uint8ClampedArray([0, 0, 255, 255]), height: 1, width: 1 } },
      ],
    }],
    width: 1,
  };
}

function pngPixels(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset < bytes.length) {
    const length = view.getUint32(offset, false);
    const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));
    if (type === "IDAT") return [...inflateSync(bytes.subarray(offset + 8, offset + 8 + length))];
    offset += length + 12;
  }
  throw new Error("IDAT missing");
}

describe("flat output formats", () => {
  it("exports one predictably named PNG per frame", () => {
    const files = exportPngSequence(project(), "Walk Cycle.aseprite");
    expect(files.map(({ filename }) => filename)).toEqual([
      "Walk-Cycle-frame-0001.png",
      "Walk-Cycle-frame-0002.png",
    ]);
    expect(pngPixels(files[0].bytes)).toEqual([0, 255, 0, 0, 255]);
    expect(pngPixels(files[1].bytes)).toEqual([0, 0, 0, 255, 255]);
  });

  it("exports a sheet and stable JSON timing/tag metadata", () => {
    const result = exportSpritesheet(project(), { columns: 2, filenameStem: "walk" });
    expect(result.columns).toBe(2);
    expect(result.rows).toBe(1);
    expect(pngPixels(result.imageFile.bytes)).toEqual([
      0,
      255, 0, 0, 255,
      0, 0, 255, 255,
    ]);
    const metadata = JSON.parse(new TextDecoder().decode(result.jsonFile.bytes));
    expect(metadata.frames.map((frame: { duration: number }) => frame.duration)).toEqual([80, 120]);
    expect(metadata.meta.frameTags).toEqual([
      { name: "walk", from: 0, to: 1, direction: "pingpong" },
    ]);
    expect(new TextDecoder().decode(result.jsonFile.bytes)).toMatch(/\n$/);
  });

  it("rejects aggregate sequence and sheet limits before allocating frames", () => {
    const oversized: SpriteProject = {
      colorMode: "rgba",
      frames: Array.from({ length: 5 }, (_, index) => ({ index, durationMs: 100 })),
      height: 4096,
      layers: [{ id: "empty", name: "Empty", opacity: 255, visible: true, cels: [] }],
      width: 4096,
    };

    expect(() => exportPngSequence(oversized)).toThrow("aggregate browser-local limit");
    expect(() => exportSpritesheet(oversized, { columns: 2 })).toThrow(
      "Spritesheet exceeds",
    );
  });
});
