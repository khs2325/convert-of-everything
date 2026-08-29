import { describe, expect, it } from "vitest";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import {
  importRespriteBytes,
  RespriteImportError,
} from ".";

type Entry = { compressionMethod?: number; content: Uint8Array; name: string };

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries: readonly Entry[]): Uint8Array {
  const localRecords: Buffer[] = [];
  const centralRecords: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const content = Buffer.from(entry.content);
    const checksum = crc32(content);
    const compressionMethod = entry.compressionMethod ?? 0;
    const compressed = compressionMethod === 8 && content.length > 0
      ? deflateRawSync(content)
      : content;
    const local = Buffer.alloc(30 + name.length + compressed.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(compressionMethod, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    compressed.copy(local, 30 + name.length);
    localRecords.push(local);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(compressionMethod, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centralRecords.push(central);
    localOffset += local.length;
  }

  const centralDirectory = Buffer.concat(centralRecords);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localRecords, centralDirectory, end]);
}

function png(width: number, height: number): Uint8Array {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

function concreteCell(id: string, x: number, y: number, width: number, height: number) {
  return {
    bounds: { origin: { x, y }, size: { height, width } },
    id,
    inherit: false,
    opacity: 1,
  };
}

function inheritedCell(id: string) {
  return {
    bounds: { origin: { x: 0, y: 0 }, size: { height: 0, width: 0 } },
    id,
    inherit: true,
    opacity: 1,
  };
}

function documentJson(overrides: Record<string, unknown> = {}) {
  return {
    canvasSize: { height: 3, width: 4 },
    frameCount: 2,
    frameDatas: [
      { clipDir: "Forward", clipName: "", duration: 1, isClipHead: false },
      { clipDir: "Forward", clipName: "", duration: 2, isClipHead: false },
    ],
    frameRate: 10,
    layerDatas: [
      {
        blendMode: "bm-normal",
        cells: [concreteCell("top", 1, -1, 2, 1), inheritedCell("top-link")],
        contentVisible: true,
        isClippingMask: false,
        isGroup: false,
        name: "Top",
        opacity: 0.5,
      },
      {
        blendMode: "bm-normal",
        cells: [concreteCell("empty", 0, 0, 0, 0), concreteCell("bottom", 0, 0, 4, 3)],
        contentVisible: false,
        isClippingMask: false,
        isGroup: false,
        name: "Bottom",
        opacity: 1,
      },
    ],
    ...overrides,
  };
}

function bundle(document = documentJson(), compressDocument = false): Uint8Array {
  const root = "fixture.resprite";
  const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
  return zip([
    {
      compressionMethod: 8,
      content: new Uint8Array(0),
      name: `${root}/ReferenceImages/`,
    },
    {
      compressionMethod: compressDocument ? 8 : 0,
      content: encode(document),
      name: `${root}/document.json`,
    },
    {
      content: encode({ canvasSize: { height: 3, width: 4 }, frameCount: 2 }),
      name: `${root}/meta.json`,
    },
    { content: png(2, 1), name: `${root}/CellData/top.png` },
    { content: png(4, 3), name: `${root}/CellData/bottom.png` },
  ]);
}

function decodePng(bytes: Uint8Array): Promise<ImageData> {
  const view = Buffer.from(bytes);
  const width = view.readUInt32BE(16);
  const height = view.readUInt32BE(20);
  return Promise.resolve({
    colorSpace: "srgb",
    data: new Uint8ClampedArray(width * height * 4).fill(255),
    height,
    width,
  } as ImageData);
}

function inflateRaw(
  bytes: Uint8Array,
  maximumOutputBytes: number,
): Promise<Uint8Array> {
  return Promise.resolve(new Uint8Array(inflateRawSync(bytes, {
    maxOutputLength: maximumOutputBytes,
  })));
}

describe("ReSprite importer", () => {
  it("maps supported frames, inherited cels, and layers into SpriteProject", async () => {
    const project = await importRespriteBytes(bundle(), { decodePng });

    expect(project).toMatchObject({
      colorMode: "rgba",
      frameTags: [],
      frames: [
        { durationMs: 100, index: 0 },
        { durationMs: 200, index: 1 },
      ],
      height: 3,
      width: 4,
    });
    expect(project.layers.map((layer) => ({
      cels: layer.cels.map((cel) => ({
        frameIndex: cel.frameIndex,
        height: cel.imageData.height,
        width: cel.imageData.width,
        x: cel.x,
        y: cel.y,
      })),
      name: layer.name,
      opacity: layer.opacity,
      visible: layer.visible,
    }))).toEqual([
      {
        cels: [{ frameIndex: 1, height: 3, width: 4, x: 0, y: 0 }],
        name: "Bottom",
        opacity: 255,
        visible: false,
      },
      {
        cels: [
          { frameIndex: 0, height: 1, width: 2, x: 1, y: -1 },
          { frameIndex: 1, height: 1, width: 2, x: 1, y: -1 },
        ],
        name: "Top",
        opacity: 128,
        visible: true,
      },
    ]);
  });

  it("reads deflated project metadata with bounded output", async () => {
    const project = await importRespriteBytes(bundle(documentJson(), true), {
      decodePng,
      inflateRaw,
    });
    expect(project).toMatchObject({ height: 3, width: 4 });
  });

  it("maps clip heads into Aseprite-compatible frame tags", async () => {
    const document = documentJson({
      frameDatas: [
        { clipDir: "PingPong", clipName: "Walk", duration: 1, isClipHead: true },
        { clipDir: "Forward", clipName: "", duration: 1, isClipHead: false },
      ],
    });
    const project = await importRespriteBytes(bundle(document), { decodePng });
    expect(project.frameTags).toEqual([
      { direction: "ping-pong", from: 0, name: "Walk", to: 1 },
    ]);
  });

  it("rejects unsupported groups instead of flattening them silently", async () => {
    const document = documentJson();
    (document.layerDatas[0] as Record<string, unknown>).isGroup = true;
    await expect(importRespriteBytes(bundle(document), { decodePng })).rejects.toMatchObject({
      code: "unsupported-feature",
      name: "RespriteImportError",
    } satisfies Partial<RespriteImportError>);
  });

  it("rejects document and metadata frame-count disagreement", async () => {
    await expect(importRespriteBytes(bundle(documentJson({ frameCount: 3 })), {
      decodePng,
    })).rejects.toThrow("document.frameDatas length must match document.frameCount");
  });

  it("rejects missing concrete cel PNG data", async () => {
    const document = documentJson();
    const topLayer = document.layerDatas[0] as Record<string, unknown>;
    const cells = topLayer.cells as Array<Record<string, unknown>>;
    cells[0] = concreteCell("missing", 0, 0, 1, 1);
    await expect(importRespriteBytes(bundle(document), { decodePng })).rejects.toMatchObject({
      code: "missing-entry",
    } satisfies Partial<RespriteImportError>);
  });

  it("keeps arbitrary decoder failures private", async () => {
    const privateError = new Error("C:\\Users\\private\\secret.resprite pixels");
    await expect(importRespriteBytes(bundle(), {
      decodePng: async () => { throw privateError; },
    })).rejects.toMatchObject({
      cause: privateError,
      code: "browser-image-decode",
      message: expect.not.stringContaining("secret.resprite"),
    });
  });
});
