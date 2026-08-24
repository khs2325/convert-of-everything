import type {
  SpriteFrameTag,
  SpriteFrameTagDirection,
  SpriteProject,
} from "../../SpriteProject";

const FILE_HEADER_SIZE = 128;
const FRAME_HEADER_SIZE = 16;
const FILE_MAGIC = 0xa5e0;
const FRAME_MAGIC = 0xf1fa;
const RGBA_COLOR_DEPTH = 32;
const LAYER_OPACITY_IS_VALID = 1;
const LAYER_VISIBLE = 1;
const LAYER_REFERENCE = 64;
const LAYER_BACKGROUND = 8;
const LAYER_UUIDS_ARE_PRESENT = 4;
const LAYER_CHUNK = 0x2004;
const CEL_CHUNK = 0x2005;
const CEL_EXTRA_CHUNK = 0x2006;
const COLOR_PROFILE_CHUNK = 0x2007;
const EXTERNAL_FILES_CHUNK = 0x2008;
const FRAME_TAGS_CHUNK = 0x2018;
const PALETTE_CHUNK = 0x2019;
const USER_DATA_CHUNK = 0x2020;
const SLICE_CHUNK = 0x2022;
const TILESET_CHUNK = 0x2023;
const OLD_PALETTE_CHUNK = 0x0004;
const OLD_PALETTE_CHUNK_2 = 0x0011;
const RAW_IMAGE_CEL = 0;
const LINKED_CEL = 1;
const COMPRESSED_IMAGE_CEL = 2;
const NORMAL_IMAGE_LAYER = 0;
const NORMAL_BLEND_MODE = 0;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_CANVAS_DIMENSION = 4096;
const MAX_FRAMES = 1000;
const MAX_LAYERS = 64;
const MAX_CELS = 4096;
const MAX_CHUNKS = 10_000;
const MAX_PALETTE_ENTRIES = 65_536;
const MAX_DECODED_BYTES = 64 * 1024 * 1024;

export const MAX_ASEPRITE_FILE_BYTES = MAX_FILE_BYTES;

export type AsepriteImportErrorCode =
  | "allocation-limit"
  | "browser-unsupported"
  | "invalid-file"
  | "invalid-zlib"
  | "unsupported-feature";

export class AsepriteImportError extends Error {
  readonly code: AsepriteImportErrorCode;

  constructor(code: AsepriteImportErrorCode, message: string) {
    super(message);
    this.name = "AsepriteImportError";
    this.code = code;
  }
}

export type AsepriteImportDependencies = {
  inflateZlib?: (
    compressed: Uint8Array,
    maximumOutputBytes: number,
  ) => Promise<Uint8Array>;
};

type ParsedCel = {
  compressed?: Uint8Array;
  frameIndex: number;
  height?: number;
  layerIndex: number;
  linkedFrameIndex?: number;
  pixels?: Uint8Array;
  width?: number;
  x: number;
  y: number;
};

function fail(code: AsepriteImportErrorCode, message: string): never {
  throw new AsepriteImportError(code, message);
}

export function getAsepriteImportDiagnostic(error: unknown): string | null {
  return error instanceof AsepriteImportError ? error.message : null;
}

class Reader {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  offset: number;

  constructor(bytes: Uint8Array, offset = 0) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.offset = offset;
  }

  ensure(length: number, field: string, limit = this.bytes.length): void {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > limit) {
      fail("invalid-file", `${field} is truncated.`);
    }
  }

  uint8(field: string, limit?: number): number {
    this.ensure(1, field, limit);
    return this.view.getUint8(this.offset++);
  }

  uint16(field: string, limit?: number): number {
    this.ensure(2, field, limit);
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  int16(field: string, limit?: number): number {
    this.ensure(2, field, limit);
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  uint32(field: string, limit?: number): number {
    this.ensure(4, field, limit);
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  skip(length: number, field: string, limit?: number): void {
    this.ensure(length, field, limit);
    this.offset += length;
  }

  take(length: number, field: string, limit?: number): Uint8Array {
    this.ensure(length, field, limit);
    const result = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }

  string(field: string, limit: number): string {
    const length = this.uint16(`${field} length`, limit);
    const encoded = this.take(length, field, limit);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(encoded);
    } catch {
      fail("invalid-file", `${field} is not valid UTF-8.`);
    }
  }
}

async function inflateZlibInBrowser(
  compressed: Uint8Array,
  maximumOutputBytes: number,
): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function") {
    fail(
      "browser-unsupported",
      "This browser does not support local Aseprite zlib decompression.",
    );
  }
  const stream = new Blob([new Uint8Array(compressed)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  const reader = stream.getReader();
  const output = new Uint8Array(maximumOutputBytes);
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return output.subarray(0, length);
    if (length + value.length > maximumOutputBytes) {
      await reader.cancel();
      fail("invalid-zlib", "An Aseprite cel inflates beyond its expected RGBA size.");
    }
    output.set(value, length);
    length += value.length;
  }
}

function checkedPixelBytes(width: number, height: number, field: string): number {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_CANVAS_DIMENSION ||
    height > MAX_CANVAS_DIMENSION
  ) {
    fail(
      "allocation-limit",
      `${field} dimensions must be from 1 through ${MAX_CANVAS_DIMENSION}.`,
    );
  }
  const bytes = width * height * 4;
  if (!Number.isSafeInteger(bytes) || bytes > MAX_DECODED_BYTES) {
    fail("allocation-limit", `${field} RGBA data exceeds the browser-local limit.`);
  }
  return bytes;
}

function validateZlibEnvelope(compressed: Uint8Array): void {
  if (compressed.length < 6) {
    fail("invalid-zlib", "Aseprite cel zlib data is truncated.");
  }
  const compressionMethod = compressed[0] & 0x0f;
  const header = compressed[0] * 256 + compressed[1];
  if (
    compressionMethod !== 8 ||
    (compressed[0] >>> 4) > 7 ||
    header % 31 !== 0 ||
    (compressed[1] & 0x20) !== 0
  ) {
    fail("invalid-zlib", "Aseprite cel zlib header is invalid or unsupported.");
  }
  validateDeflateEnd(compressed.subarray(2, compressed.length - 4));
}

class DeflateBitReader {
  bitOffset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readBits(count: number): number {
    if (this.bitOffset + count > this.bytes.length * 8) {
      fail("invalid-zlib", "Aseprite cel deflate stream is truncated.");
    }
    let value = 0;
    for (let bit = 0; bit < count; bit += 1) {
      const absolute = this.bitOffset++;
      value |= ((this.bytes[absolute >>> 3] >>> (absolute & 7)) & 1) << bit;
    }
    return value;
  }

  alignToByte(): void {
    this.bitOffset = (this.bitOffset + 7) & ~7;
  }

  skipBytes(count: number): void {
    this.alignToByte();
    if (this.bitOffset / 8 + count > this.bytes.length) {
      fail("invalid-zlib", "Aseprite cel stored deflate block is truncated.");
    }
    this.bitOffset += count * 8;
  }
}

type HuffmanTable = Map<number, number>;

function reverseBits(value: number, length: number): number {
  let reversed = 0;
  for (let bit = 0; bit < length; bit += 1) {
    reversed = (reversed << 1) | ((value >>> bit) & 1);
  }
  return reversed;
}

function buildHuffmanTable(lengths: readonly number[]): HuffmanTable {
  const counts = new Uint16Array(16);
  for (const length of lengths) {
    if (length > 15) fail("invalid-zlib", "Aseprite cel has an invalid Huffman code length.");
    if (length > 0) counts[length] += 1;
  }
  if (counts.every((count) => count === 0)) {
    fail("invalid-zlib", "Aseprite cel has an empty Huffman table.");
  }
  let available = 1;
  for (let length = 1; length <= 15; length += 1) {
    available = available * 2 - counts[length];
    if (available < 0) fail("invalid-zlib", "Aseprite cel has an oversubscribed Huffman table.");
  }
  const nextCode = new Uint16Array(16);
  let code = 0;
  for (let length = 1; length <= 15; length += 1) {
    code = (code + counts[length - 1]) << 1;
    nextCode[length] = code;
  }
  const table: HuffmanTable = new Map();
  lengths.forEach((length, symbol) => {
    if (length === 0) return;
    table.set(length * 0x10000 + reverseBits(nextCode[length]++, length), symbol);
  });
  return table;
}

function decodeHuffman(reader: DeflateBitReader, table: HuffmanTable): number {
  let code = 0;
  for (let length = 1; length <= 15; length += 1) {
    code |= reader.readBits(1) << (length - 1);
    const symbol = table.get(length * 0x10000 + code);
    if (symbol !== undefined) return symbol;
  }
  fail("invalid-zlib", "Aseprite cel contains an invalid Huffman code.");
}

const CODE_LENGTH_ORDER = [
  16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
];
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4,
  4, 4, 5, 5, 5, 5, 0,
];
const DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9,
  10, 10, 11, 11, 12, 12, 13, 13,
];

function fixedTables(): [HuffmanTable, HuffmanTable] {
  const literalLengths = new Array<number>(288).fill(0);
  literalLengths.fill(8, 0, 144);
  literalLengths.fill(9, 144, 256);
  literalLengths.fill(7, 256, 280);
  literalLengths.fill(8, 280);
  return [
    buildHuffmanTable(literalLengths),
    buildHuffmanTable(new Array<number>(32).fill(5)),
  ];
}

function dynamicTables(reader: DeflateBitReader): [HuffmanTable, HuffmanTable] {
  const literalCount = reader.readBits(5) + 257;
  const distanceCount = reader.readBits(5) + 1;
  const codeLengthCount = reader.readBits(4) + 4;
  const codeLengthLengths = new Array<number>(19).fill(0);
  for (let index = 0; index < codeLengthCount; index += 1) {
    codeLengthLengths[CODE_LENGTH_ORDER[index]] = reader.readBits(3);
  }
  const codeLengthTable = buildHuffmanTable(codeLengthLengths);
  const lengths: number[] = [];
  const total = literalCount + distanceCount;
  while (lengths.length < total) {
    const symbol = decodeHuffman(reader, codeLengthTable);
    if (symbol <= 15) {
      lengths.push(symbol);
      continue;
    }
    let repeat: number;
    let value = 0;
    if (symbol === 16) {
      if (lengths.length === 0) {
        fail("invalid-zlib", "Aseprite cel repeats a missing Huffman code length.");
      }
      value = lengths[lengths.length - 1];
      repeat = reader.readBits(2) + 3;
    } else if (symbol === 17) {
      repeat = reader.readBits(3) + 3;
    } else if (symbol === 18) {
      repeat = reader.readBits(7) + 11;
    } else {
      fail("invalid-zlib", "Aseprite cel has an invalid code-length symbol.");
    }
    if (lengths.length + repeat > total) {
      fail("invalid-zlib", "Aseprite cel Huffman code lengths overflow their table.");
    }
    lengths.push(...new Array<number>(repeat).fill(value));
  }
  const literalLengths = lengths.slice(0, literalCount);
  if (literalLengths[256] === 0) {
    fail("invalid-zlib", "Aseprite cel Huffman table is missing its end code.");
  }
  return [
    buildHuffmanTable(literalLengths),
    buildHuffmanTable(lengths.slice(literalCount)),
  ];
}

function validateDeflateEnd(deflate: Uint8Array): void {
  const reader = new DeflateBitReader(deflate);
  let finalBlock = false;
  while (!finalBlock) {
    finalBlock = reader.readBits(1) === 1;
    const blockType = reader.readBits(2);
    if (blockType === 0) {
      reader.alignToByte();
      const length = reader.readBits(16);
      const complement = reader.readBits(16);
      if (((length ^ 0xffff) & 0xffff) !== complement) {
        fail("invalid-zlib", "Aseprite cel stored deflate block has an invalid length.");
      }
      reader.skipBytes(length);
      continue;
    }
    if (blockType === 3) {
      fail("invalid-zlib", "Aseprite cel uses a reserved deflate block type.");
    }
    const [literalTable, distanceTable] =
      blockType === 1 ? fixedTables() : dynamicTables(reader);
    while (true) {
      const symbol = decodeHuffman(reader, literalTable);
      if (symbol < 256) continue;
      if (symbol === 256) break;
      if (symbol > 285) {
        fail("invalid-zlib", "Aseprite cel contains a reserved length symbol.");
      }
      reader.readBits(LENGTH_EXTRA[symbol - 257]);
      const distanceSymbol = decodeHuffman(reader, distanceTable);
      if (distanceSymbol > 29) {
        fail("invalid-zlib", "Aseprite cel contains a reserved distance symbol.");
      }
      reader.readBits(DISTANCE_EXTRA[distanceSymbol]);
    }
  }
  if (Math.ceil(reader.bitOffset / 8) !== deflate.length) {
    fail("invalid-zlib", "Aseprite cel zlib stream contains trailing compressed data.");
  }
}

function adler32(bytes: Uint8Array): number {
  let first = 1;
  let second = 0;
  for (const byte of bytes) {
    first = (first + byte) % 65_521;
    second = (second + first) % 65_521;
  }
  return ((second << 16) | first) >>> 0;
}

function validateZlibChecksum(compressed: Uint8Array, pixels: Uint8Array): void {
  const offset = compressed.length - 4;
  const expected =
    compressed[offset] * 0x1000000 +
    compressed[offset + 1] * 0x10000 +
    compressed[offset + 2] * 0x100 +
    compressed[offset + 3];
  if (adler32(pixels) !== expected >>> 0) {
    fail("invalid-zlib", "Aseprite cel zlib checksum or trailing data is invalid.");
  }
}

function imageData(width: number, height: number, pixels: Uint8Array): ImageData {
  return {
    colorSpace: "srgb",
    data: new Uint8ClampedArray(
      pixels.buffer.slice(pixels.byteOffset, pixels.byteOffset + pixels.byteLength),
    ),
    height,
    width,
  } as ImageData;
}

function direction(value: number, field: string): SpriteFrameTagDirection {
  if (value === 0) return "forward";
  if (value === 1) return "reverse";
  if (value === 2) return "ping-pong";
  fail("unsupported-feature", `${field} uses an unsupported loop direction.`);
}

function parseTags(reader: Reader, end: number, frameCount: number): SpriteFrameTag[] {
  const count = reader.uint16("Aseprite frame-tag count", end);
  reader.skip(8, "Aseprite frame-tag reserved bytes", end);
  const tags: SpriteFrameTag[] = [];
  const names = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    const from = reader.uint16(`Aseprite tag ${index + 1} start`, end);
    const to = reader.uint16(`Aseprite tag ${index + 1} end`, end);
    const loopDirection = direction(
      reader.uint8(`Aseprite tag ${index + 1} direction`, end),
      `Aseprite tag ${index + 1}`,
    );
    const repeatCount = reader.uint16(`Aseprite tag ${index + 1} repeat count`, end);
    reader.skip(10, `Aseprite tag ${index + 1} reserved data`, end);
    const name = reader.string(`Aseprite tag ${index + 1} name`, end);
    if (from > to || to >= frameCount || name.trim().length === 0 || names.has(name)) {
      fail("invalid-file", `Aseprite tag ${index + 1} has an invalid range or name.`);
    }
    if (repeatCount !== 0) {
      fail(
        "unsupported-feature",
        `Aseprite tag ${index + 1} uses a repeat count that SpriteProject cannot preserve.`,
      );
    }
    names.add(name);
    tags.push({ direction: loopDirection, from, name, to });
  }
  if (reader.offset !== end) {
    fail("invalid-file", "Aseprite frame-tags chunk has trailing data.");
  }
  return tags;
}

function validateColorProfile(reader: Reader, end: number): void {
  const profileType = reader.uint16("Aseprite color-profile type", end);
  const flags = reader.uint16("Aseprite color-profile flags", end);
  reader.uint32("Aseprite color-profile gamma", end);
  reader.skip(8, "Aseprite color-profile reserved bytes", end);
  if (profileType === 2 || (flags & 1) !== 0) {
    fail(
      "unsupported-feature",
      "Aseprite files with embedded ICC profiles or fixed gamma are not supported.",
    );
  }
  if ((flags & ~1) !== 0) {
    fail("invalid-file", "Aseprite color-profile flags are invalid.");
  }
  if (profileType !== 0 && profileType !== 1) {
    fail("invalid-file", "Aseprite color-profile type is invalid.");
  }
  if (reader.offset !== end) {
    fail("invalid-file", "Aseprite color-profile chunk has unexpected data.");
  }
}

function validatePalette(reader: Reader, end: number): void {
  const paletteSize = reader.uint32("Aseprite palette size", end);
  const first = reader.uint32("Aseprite palette first index", end);
  const last = reader.uint32("Aseprite palette last index", end);
  reader.skip(8, "Aseprite palette reserved bytes", end);
  if (first > last || last >= paletteSize) {
    fail("invalid-file", "Aseprite palette range is invalid.");
  }
  if (last - first + 1 > MAX_PALETTE_ENTRIES) {
    fail("allocation-limit", `Aseprite palette range exceeds ${MAX_PALETTE_ENTRIES} entries.`);
  }
  for (let index = first; index <= last; index += 1) {
    const flags = reader.uint16(`Aseprite palette entry ${index} flags`, end);
    reader.skip(4, `Aseprite palette entry ${index} RGBA value`, end);
    if ((flags & 1) !== 0) {
      reader.string(`Aseprite palette entry ${index} name`, end);
    }
    if ((flags & ~1) !== 0) {
      fail("invalid-file", `Aseprite palette entry ${index} flags are invalid.`);
    }
  }
  if (reader.offset !== end) {
    fail("invalid-file", "Aseprite palette chunk has trailing data.");
  }
}

function validateOldPalette(reader: Reader, end: number): void {
  const packetCount = reader.uint16("Aseprite old palette packet count", end);
  for (let packet = 0; packet < packetCount; packet += 1) {
    reader.uint8(`Aseprite old palette packet ${packet + 1} skip count`, end);
    const encodedColorCount = reader.uint8(
      `Aseprite old palette packet ${packet + 1} color count`,
      end,
    );
    const colorCount = encodedColorCount === 0 ? 256 : encodedColorCount;
    reader.skip(colorCount * 3, `Aseprite old palette packet ${packet + 1} colors`, end);
  }
  if (reader.offset !== end) {
    fail("invalid-file", "Aseprite old palette chunk has trailing data.");
  }
}

function validateEmptyUserData(reader: Reader, end: number): void {
  const flags = reader.uint32("Aseprite user-data flags", end);
  if (flags !== 0 || reader.offset !== end) {
    fail(
      "unsupported-feature",
      "Aseprite user data is not represented by the current SpriteProject subset.",
    );
  }
}

export async function importAsepriteBytes(
  bytes: Uint8Array,
  dependencies: AsepriteImportDependencies = {},
): Promise<SpriteProject> {
  if (!(bytes instanceof Uint8Array) || bytes.length < FILE_HEADER_SIZE) {
    fail("invalid-file", "Aseprite input is smaller than its 128-byte header.");
  }
  if (bytes.length > MAX_FILE_BYTES) {
    fail("allocation-limit", `Aseprite input exceeds the ${MAX_FILE_BYTES}-byte browser-local limit.`);
  }
  const reader = new Reader(bytes);
  const declaredSize = reader.uint32("Aseprite file size");
  if (declaredSize !== bytes.length) {
    fail("invalid-file", "Aseprite file size does not match the selected bytes.");
  }
  if (reader.uint16("Aseprite file magic") !== FILE_MAGIC) {
    fail("invalid-file", "Aseprite file magic is invalid.");
  }
  const frameCount = reader.uint16("Aseprite frame count");
  const width = reader.uint16("Aseprite canvas width");
  const height = reader.uint16("Aseprite canvas height");
  const colorDepth = reader.uint16("Aseprite color depth");
  const headerFlags = reader.uint32("Aseprite header flags");
  const fallbackDuration = reader.uint16("Aseprite fallback duration");
  reader.skip(14, "Aseprite header metadata");
  const pixelWidth = reader.uint8("Aseprite pixel-aspect width");
  const pixelHeight = reader.uint8("Aseprite pixel-aspect height");
  if (pixelWidth !== 0 && pixelHeight !== 0 && pixelWidth !== pixelHeight) {
    fail(
      "unsupported-feature",
      "Aseprite files with non-square pixel aspect are not supported.",
    );
  }
  if (frameCount < 1 || frameCount > MAX_FRAMES) {
    fail("allocation-limit", `Aseprite frame count must be from 1 through ${MAX_FRAMES}.`);
  }
  if ((headerFlags & ~7) !== 0) {
    fail("invalid-file", "Aseprite header contains unknown file flags.");
  }
  checkedPixelBytes(width, height, "Aseprite canvas");
  if (colorDepth !== RGBA_COLOR_DEPTH) {
    fail(
      "unsupported-feature",
      "Only 32-bit RGBA Aseprite files are supported; indexed and grayscale files are not yet converted.",
    );
  }
  reader.offset = FILE_HEADER_SIZE;

  const frames: SpriteProject["frames"] = [];
  const layers: SpriteProject["layers"] = [];
  const parsedCels = new Map<string, ParsedCel>();
  let frameTags: SpriteFrameTag[] | undefined;
  let totalChunks = 0;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const frameStart = reader.offset;
    const frameSize = reader.uint32(`Aseprite frame ${frameIndex + 1} size`);
    if (frameSize < FRAME_HEADER_SIZE || frameStart + frameSize > bytes.length) {
      fail("invalid-file", `Aseprite frame ${frameIndex + 1} has an invalid size.`);
    }
    const frameEnd = frameStart + frameSize;
    if (reader.uint16(`Aseprite frame ${frameIndex + 1} magic`, frameEnd) !== FRAME_MAGIC) {
      fail("invalid-file", `Aseprite frame ${frameIndex + 1} magic is invalid.`);
    }
    const oldChunkCount = reader.uint16(`Aseprite frame ${frameIndex + 1} old chunk count`, frameEnd);
    const frameDuration = reader.uint16(`Aseprite frame ${frameIndex + 1} duration`, frameEnd);
    reader.skip(2, `Aseprite frame ${frameIndex + 1} reserved bytes`, frameEnd);
    const newChunkCount = reader.uint32(`Aseprite frame ${frameIndex + 1} chunk count`, frameEnd);
    const chunkCount = newChunkCount === 0 ? oldChunkCount : newChunkCount;
    const durationMs = frameDuration === 0 ? fallbackDuration : frameDuration;
    if (durationMs < 1) {
      fail("invalid-file", `Aseprite frame ${frameIndex + 1} has no positive duration.`);
    }
    frames.push({ durationMs, index: frameIndex });

    let actualChunks = 0;
    while (reader.offset < frameEnd) {
      const chunkStart = reader.offset;
      const chunkSize = reader.uint32(`Aseprite frame ${frameIndex + 1} chunk size`, frameEnd);
      const chunkType = reader.uint16(`Aseprite frame ${frameIndex + 1} chunk type`, frameEnd);
      if (chunkSize < 6 || chunkStart + chunkSize > frameEnd) {
        fail("invalid-file", `Aseprite frame ${frameIndex + 1} contains an invalid chunk envelope.`);
      }
      const chunkEnd = chunkStart + chunkSize;
      actualChunks += 1;
      totalChunks += 1;
      if (totalChunks > MAX_CHUNKS) {
        fail("allocation-limit", `Aseprite chunk count exceeds ${MAX_CHUNKS}.`);
      }

      if (chunkType === LAYER_CHUNK) {
        if (layers.length >= MAX_LAYERS) {
          fail("allocation-limit", `Aseprite layer count exceeds ${MAX_LAYERS}.`);
        }
        const flags = reader.uint16("Aseprite layer flags", chunkEnd);
        const layerType = reader.uint16("Aseprite layer type", chunkEnd);
        const childLevel = reader.uint16("Aseprite layer child level", chunkEnd);
        reader.skip(4, "Aseprite layer default dimensions", chunkEnd);
        const blendMode = reader.uint16("Aseprite layer blend mode", chunkEnd);
        const sourceOpacity = reader.uint8("Aseprite layer opacity", chunkEnd);
        reader.skip(3, "Aseprite layer reserved bytes", chunkEnd);
        const name = reader.string("Aseprite layer name", chunkEnd);
        if ((headerFlags & LAYER_UUIDS_ARE_PRESENT) !== 0) {
          reader.take(16, "Aseprite layer UUID", chunkEnd);
        }
        if (
          layerType !== NORMAL_IMAGE_LAYER ||
          childLevel !== 0 ||
          blendMode !== NORMAL_BLEND_MODE ||
          (flags & (LAYER_REFERENCE | LAYER_BACKGROUND)) !== 0
        ) {
          fail(
            "unsupported-feature",
            "Aseprite input contains a group, tilemap, reference, nested, or non-normal layer that the current SpriteProject cannot preserve.",
          );
        }
        if (name.trim().length === 0 || reader.offset !== chunkEnd) {
          fail("invalid-file", "Aseprite layer name or chunk length is invalid.");
        }
        layers.push({
          cels: [],
          id: `aseprite-layer-${layers.length}`,
          name,
          opacity: (headerFlags & LAYER_OPACITY_IS_VALID) !== 0 ? sourceOpacity : 255,
          visible: (flags & LAYER_VISIBLE) !== 0,
        });
      } else if (chunkType === CEL_CHUNK) {
        if (parsedCels.size >= MAX_CELS) {
          fail("allocation-limit", `Aseprite cel count exceeds ${MAX_CELS}.`);
        }
        const layerIndex = reader.uint16("Aseprite cel layer index", chunkEnd);
        const x = reader.int16("Aseprite cel x position", chunkEnd);
        const y = reader.int16("Aseprite cel y position", chunkEnd);
        const opacity = reader.uint8("Aseprite cel opacity", chunkEnd);
        const celType = reader.uint16("Aseprite cel type", chunkEnd);
        const zIndex = reader.int16("Aseprite cel z-index", chunkEnd);
        reader.skip(5, "Aseprite cel reserved bytes", chunkEnd);
        if (layerIndex >= layers.length) {
          fail("invalid-file", "Aseprite cel references a layer that has not been defined.");
        }
        if (opacity !== 255 || zIndex !== 0) {
          fail(
            "unsupported-feature",
            "Aseprite input uses per-cel opacity or z-index that SpriteProject cannot preserve.",
          );
        }
        const key = `${layerIndex}:${frameIndex}`;
        if (parsedCels.has(key)) {
          fail("invalid-file", "Aseprite input contains duplicate cels for one layer and frame.");
        }
        const parsed: ParsedCel = { frameIndex, layerIndex, x, y };
        if (celType === COMPRESSED_IMAGE_CEL) {
          const celWidth = reader.uint16("Aseprite cel width", chunkEnd);
          const celHeight = reader.uint16("Aseprite cel height", chunkEnd);
          const expectedBytes = checkedPixelBytes(celWidth, celHeight, "Aseprite cel");
          parsed.width = celWidth;
          parsed.height = celHeight;
          parsed.compressed = reader.take(chunkEnd - reader.offset, "Aseprite compressed cel", chunkEnd);
          validateZlibEnvelope(parsed.compressed);
        } else if (celType === RAW_IMAGE_CEL || celType === LINKED_CEL) {
          fail(
            "unsupported-feature",
            "Aseprite raw and linked cels are outside the current compressed-cel subset.",
          );
        } else {
          fail("unsupported-feature", "Aseprite compressed tilemap cels are not supported.");
        }
        parsedCels.set(key, parsed);
      } else if (chunkType === FRAME_TAGS_CHUNK) {
        if (frameTags !== undefined) {
          fail("invalid-file", "Aseprite input contains more than one frame-tags chunk.");
        }
        frameTags = parseTags(reader, chunkEnd, frameCount);
      } else if (chunkType === COLOR_PROFILE_CHUNK) {
        validateColorProfile(reader, chunkEnd);
      } else if (chunkType === PALETTE_CHUNK) {
        validatePalette(reader, chunkEnd);
      } else if (chunkType === OLD_PALETTE_CHUNK || chunkType === OLD_PALETTE_CHUNK_2) {
        validateOldPalette(reader, chunkEnd);
      } else if (chunkType === USER_DATA_CHUNK) {
        validateEmptyUserData(reader, chunkEnd);
      } else if (
        chunkType === CEL_EXTRA_CHUNK ||
        chunkType === EXTERNAL_FILES_CHUNK ||
        chunkType === SLICE_CHUNK ||
        chunkType === TILESET_CHUNK
      ) {
        fail(
          "unsupported-feature",
          `Aseprite input contains unsupported chunk 0x${chunkType.toString(16)}.`,
        );
      } else {
        fail(
          "unsupported-feature",
          `Aseprite input contains unknown chunk 0x${chunkType.toString(16)}.`,
        );
      }
      reader.offset = chunkEnd;
    }
    if (reader.offset !== frameEnd || actualChunks !== chunkCount) {
      fail("invalid-file", `Aseprite frame ${frameIndex + 1} chunk count or size is inconsistent.`);
    }
  }

  if (reader.offset !== bytes.length || layers.length === 0) {
    fail("invalid-file", "Aseprite input has trailing bytes or no supported raster layers.");
  }

  const inflate = dependencies.inflateZlib ?? inflateZlibInBrowser;
  let decodedBytes = 0;
  const resolving = new Set<string>();
  const resolved = new Map<string, ImageData>();
  const resolveCel = async (key: string): Promise<ImageData> => {
    const cached = resolved.get(key);
    if (cached !== undefined) return cached;
    const cel = parsedCels.get(key);
    if (cel === undefined) fail("invalid-file", "Aseprite linked cel target does not exist.");
    if (resolving.has(key)) fail("invalid-file", "Aseprite linked cels contain a cycle.");
    resolving.add(key);
    let result: ImageData;
    if (cel.linkedFrameIndex !== undefined) {
      result = await resolveCel(`${cel.layerIndex}:${cel.linkedFrameIndex}`);
    } else {
      const celWidth = cel.width!;
      const celHeight = cel.height!;
      const expectedBytes = checkedPixelBytes(celWidth, celHeight, "Aseprite cel");
      decodedBytes += expectedBytes;
      if (decodedBytes > MAX_DECODED_BYTES) {
        fail("allocation-limit", "Aseprite decoded cel pixels exceed the browser-local limit.");
      }
      let pixels = cel.pixels;
      if (pixels === undefined) {
        try {
          pixels = await inflate(cel.compressed!, expectedBytes);
        } catch (error) {
          if (error instanceof AsepriteImportError) throw error;
          fail("invalid-zlib", "Could not decompress Aseprite cel pixels.");
        }
      }
      if (!(pixels instanceof Uint8Array) || pixels.length !== expectedBytes) {
        fail("invalid-zlib", `Aseprite cel inflates to an unexpected RGBA byte length.`);
      }
      validateZlibChecksum(cel.compressed!, pixels);
      result = imageData(celWidth, celHeight, pixels);
    }
    resolving.delete(key);
    resolved.set(key, result);
    return result;
  };

  for (const [key, cel] of parsedCels) {
    layers[cel.layerIndex].cels.push({
      frameIndex: cel.frameIndex,
      imageData: await resolveCel(key),
      x: cel.x,
      y: cel.y,
    });
  }
  layers.forEach((layer) => layer.cels.sort((left, right) => left.frameIndex - right.frameIndex));

  return {
    colorMode: "rgba",
    frameTags,
    frames,
    height,
    layers,
    width,
  };
}

export async function importAseprite(
  file: File,
  dependencies: AsepriteImportDependencies = {},
): Promise<SpriteProject> {
  if (file.size > MAX_FILE_BYTES) {
    fail("allocation-limit", `Aseprite input exceeds the ${MAX_FILE_BYTES}-byte browser-local limit.`);
  }
  return importAsepriteBytes(new Uint8Array(await file.arrayBuffer()), dependencies);
}
