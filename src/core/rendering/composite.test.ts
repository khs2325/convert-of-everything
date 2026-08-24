import { describe, expect, it } from "vitest";

import type { SpriteLayer, SpriteProject } from "../SpriteProject";
import { compositeFrame } from "./composite";

function image(bytes: number[], width = 1, height = 1): ImageData {
  return { colorSpace: "srgb", data: new Uint8ClampedArray(bytes), height, width };
}

function layer(id: string, pixels: number[], opacity = 255): SpriteLayer {
  return {
    id,
    name: id,
    opacity,
    visible: true,
    cels: [{ frameIndex: 0, x: 0, y: 0, imageData: image(pixels) }],
  };
}

function project(layers: SpriteLayer[], width = 1, height = 1): SpriteProject {
  return {
    colorMode: "rgba",
    frames: [{ index: 0, durationMs: 100 }],
    height,
    layers,
    width,
  };
}

describe("compositeFrame", () => {
  it("composites back-to-front with layer opacity", () => {
    const result = compositeFrame(project([
      layer("bottom", [0, 0, 255, 255]),
      layer("top", [255, 0, 0, 255], 128),
    ]), 0);

    expect([...result.data]).toEqual([128, 0, 127, 255]);
  });

  it("keeps straight color while combining pixel and layer alpha", () => {
    const result = compositeFrame(project([
      layer("top", [255, 0, 0, 128], 128),
    ]), 0);

    expect([...result.data]).toEqual([255, 0, 0, 64]);
  });

  it("clips signed cel positions to the project canvas", () => {
    const clipped = layer("clipped", [
      1, 0, 0, 255, 2, 0, 0, 255,
      3, 0, 0, 255, 4, 0, 0, 255,
    ]);
    clipped.cels[0].x = -1;
    clipped.cels[0].y = -1;
    clipped.cels[0].imageData = image([
      1, 0, 0, 255, 2, 0, 0, 255,
      3, 0, 0, 255, 4, 0, 0, 255,
    ], 2, 2);

    expect([...compositeFrame(project([clipped], 1, 1), 0).data]).toEqual([4, 0, 0, 255]);
  });

  it("skips hidden layers and missing cels", () => {
    const hidden = layer("hidden", [255, 0, 0, 255]);
    hidden.visible = false;
    const missing = layer("missing", [0, 255, 0, 255]);
    missing.cels = [];
    expect([...compositeFrame(project([hidden, missing]), 0).data]).toEqual([0, 0, 0, 0]);
  });
});
