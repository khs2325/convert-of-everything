import { inflateSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

import type { SpriteProject } from "../../SpriteProject";
import { exportAseprite } from "../../exporters/aseprite";
import { importAseprite, importAsepriteBytes, MAX_ASEPRITE_FILE_BYTES } from ".";

function fixture(): SpriteProject {
  return {
    colorMode: "rgba",
    frameTags: [{ name: "idle", from: 0, to: 1, direction: "forward" }],
    frames: [{ index: 0, durationMs: 80 }, { index: 1, durationMs: 120 }],
    height: 2,
    layers: [{
      id: "base",
      name: "Base Ω",
      opacity: 200,
      visible: true,
      cels: [
        { frameIndex: 0, x: 0, y: 0, imageData: { colorSpace: "srgb", data: new Uint8ClampedArray([255, 0, 0, 255]), height: 1, width: 1 } },
        { frameIndex: 1, x: 1, y: 1, imageData: { colorSpace: "srgb", data: new Uint8ClampedArray([0, 0, 255, 128]), height: 1, width: 1 } },
      ],
    }],
    width: 2,
  };
}

const dependencies = {
  inflateZlib: async (bytes: Uint8Array): Promise<Uint8Array> => new Uint8Array(inflateSync(bytes)),
};

function findFirstChunk(bytes: Uint8Array, type: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frameEnd = 128 + view.getUint32(128, true);
  let offset = 144;
  while (offset < frameEnd) {
    const size = view.getUint32(offset, true);
    if (view.getUint16(offset + 4, true) === type) return offset;
    offset += size;
  }
  throw new Error(`Fixture does not contain chunk 0x${type.toString(16)}.`);
}

function appendChunkToFirstFrame(
  bytes: Uint8Array,
  type: number,
  payload: Uint8Array,
): Uint8Array {
  const sourceView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frameEnd = 128 + sourceView.getUint32(128, true);
  const chunkSize = 6 + payload.length;
  const result = new Uint8Array(bytes.length + chunkSize);
  result.set(bytes.subarray(0, frameEnd));
  result.set(bytes.subarray(frameEnd), frameEnd + chunkSize);
  result.set(payload, frameEnd + 6);
  const view = new DataView(result.buffer);
  view.setUint32(frameEnd, chunkSize, true);
  view.setUint16(frameEnd + 4, type, true);
  view.setUint32(0, result.length, true);
  view.setUint32(128, sourceView.getUint32(128, true) + chunkSize, true);
  view.setUint16(134, sourceView.getUint16(134, true) + 1, true);
  return result;
}

describe("importAsepriteBytes", () => {
  it("reads the deterministic subset produced by the local writer", async () => {
    const source = fixture();
    const imported = await importAsepriteBytes(exportAseprite(source), dependencies);
    expect(imported).toMatchObject({
      width: 2,
      height: 2,
      frames: source.frames,
      frameTags: source.frameTags,
      layers: [{ name: "Base Ω", opacity: 200, visible: true }],
    });
    expect([...imported.layers[0].cels[1].imageData.data]).toEqual([0, 0, 255, 128]);
  });

  it("rejects a bad file magic with a typed diagnostic", async () => {
    const bytes = exportAseprite(fixture());
    bytes[4] = 0;
    await expect(importAsepriteBytes(bytes, dependencies)).rejects.toMatchObject({
      name: "AsepriteImportError",
    });
  });

  it.each([
    ["declared file size", (bytes: Uint8Array) => new DataView(bytes.buffer).setUint32(0, bytes.length - 1, true)],
    ["frame size", (bytes: Uint8Array) => new DataView(bytes.buffer).setUint32(128, 15, true)],
    ["chunk size", (bytes: Uint8Array) => new DataView(bytes.buffer).setUint32(144, 5, true)],
    ["chunk count", (bytes: Uint8Array) => {
      const view = new DataView(bytes.buffer);
      view.setUint16(134, view.getUint16(134, true) + 1, true);
    }],
  ])("rejects an invalid %s envelope", async (_label, mutate) => {
    const bytes = exportAseprite(fixture());
    mutate(bytes);
    await expect(importAsepriteBytes(bytes, dependencies)).rejects.toMatchObject({
      code: "invalid-file",
    });
  });

  it("does not leak inflater errors", async () => {
    await expect(importAsepriteBytes(exportAseprite(fixture()), {
      inflateZlib: async () => { throw new Error("C:\\private\\secret"); },
    })).rejects.toEqual(expect.objectContaining({
      code: "invalid-zlib",
    }));
  });

  it.each([0, 5])("rejects an inflated cel length of %i bytes", async (length) => {
    await expect(importAsepriteBytes(exportAseprite(fixture()), {
      inflateZlib: async () => new Uint8Array(length),
    })).rejects.toMatchObject({ code: "invalid-zlib" });
  });

  it("rejects non-square pixel aspect instead of changing rendered geometry", async () => {
    const bytes = exportAseprite(fixture());
    bytes[34] = 2;
    bytes[35] = 1;

    await expect(importAsepriteBytes(bytes, dependencies)).rejects.toMatchObject({
      code: "unsupported-feature",
    });
  });

  it.each([0, 1])("rejects cel type %i outside the compressed-cel subset", async (celType) => {
    const bytes = exportAseprite(fixture());
    const celStart = findFirstChunk(bytes, 0x2005);
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      .setUint16(celStart + 13, celType, true);

    await expect(importAsepriteBytes(bytes, dependencies)).rejects.toMatchObject({
      code: "unsupported-feature",
    });
  });

  it("rejects a cel that references an undefined layer", async () => {
    const bytes = exportAseprite(fixture());
    const celStart = findFirstChunk(bytes, 0x2005);
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      .setUint16(celStart + 6, 63, true);

    await expect(importAsepriteBytes(bytes, dependencies)).rejects.toMatchObject({
      code: "invalid-file",
    });
  });

  it("rejects trailing data even when a duplicate checksum hides the suffix", async () => {
    const bytes = exportAseprite(fixture());
    const celStart = findFirstChunk(bytes, 0x2005);
    const sourceView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const celEnd = celStart + sourceView.getUint32(celStart, true);
    const checksum = bytes.slice(celEnd - 4, celEnd);
    const suffix = new Uint8Array([0xde, 0xad, 0xbe, 0xef, ...checksum]);
    const result = new Uint8Array(bytes.length + suffix.length);
    result.set(bytes.subarray(0, celEnd));
    result.set(suffix, celEnd);
    result.set(bytes.subarray(celEnd), celEnd + suffix.length);
    const view = new DataView(result.buffer);
    view.setUint32(0, result.length, true);
    view.setUint32(128, sourceView.getUint32(128, true) + suffix.length, true);
    view.setUint32(celStart, sourceView.getUint32(celStart, true) + suffix.length, true);

    await expect(importAsepriteBytes(result, dependencies)).rejects.toMatchObject({
      code: "invalid-zlib",
    });
  });

  it("rejects unknown chunk types", async () => {
    const bytes = appendChunkToFirstFrame(exportAseprite(fixture()), 0x7777, new Uint8Array());
    await expect(importAsepriteBytes(bytes, dependencies)).rejects.toMatchObject({
      code: "unsupported-feature",
    });
  });

  it("caps palette ranges before iterating entries", async () => {
    const payload = new Uint8Array(20);
    const view = new DataView(payload.buffer);
    view.setUint32(0, 65_537, true);
    view.setUint32(4, 0, true);
    view.setUint32(8, 65_536, true);
    const bytes = appendChunkToFirstFrame(exportAseprite(fixture()), 0x2019, payload);

    await expect(importAsepriteBytes(bytes, dependencies)).rejects.toMatchObject({
      code: "allocation-limit",
    });
  });

  it("rejects non-empty user data that SpriteProject cannot preserve", async () => {
    const payload = new Uint8Array(4);
    new DataView(payload.buffer).setUint32(0, 1, true);
    const bytes = appendChunkToFirstFrame(exportAseprite(fixture()), 0x2020, payload);

    await expect(importAsepriteBytes(bytes, dependencies)).rejects.toMatchObject({
      code: "unsupported-feature",
    });
  });

  it("rejects an oversized File before reading its bytes", async () => {
    const arrayBuffer = vi.fn();
    const file = {
      arrayBuffer,
      size: MAX_ASEPRITE_FILE_BYTES + 1,
    } as unknown as File;

    await expect(importAseprite(file, dependencies)).rejects.toMatchObject({
      code: "allocation-limit",
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});
