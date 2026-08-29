import {
  normalizeFrameDurationMs,
  type SpriteCel,
  type SpriteFrameTag,
  type SpriteProject,
} from "../../SpriteProject";

export const MAX_RESPRITE_FILE_BYTES = 32 * 1024 * 1024;

const MAX_DOCUMENT_JSON_BYTES = 8 * 1024 * 1024;
const MAX_ARCHIVE_OUTPUT_BYTES = 192 * 1024 * 1024;
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 4096;
const MAX_DIMENSION = 4096;
const MAX_CANVAS_PIXELS = 16_777_216;
const MAX_FRAMES = 512;
const MAX_LAYERS = 256;
const MAX_CELS = 65_536;
const MAX_TOTAL_CEL_PIXELS = 67_108_864;
const MAX_STRING_LENGTH = 1024;
const MAX_PATH_LENGTH = 512;
const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_STORED = 0;
const ZIP_DEFLATED = 8;
const ZIP_FLAG_ENCRYPTED = 1;
const ZIP64_SENTINEL = 0xffffffff;
const INT16_MIN = -0x8000;
const INT16_MAX = 0x7fff;
const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export type RespriteImportErrorCode =
  | "allocation-limit"
  | "browser-image-decode"
  | "browser-unsupported"
  | "file-read"
  | "file-too-large"
  | "invalid-container"
  | "invalid-document"
  | "invalid-png"
  | "missing-entry"
  | "unsafe-path"
  | "unsupported-feature"
  | "unsupported-zip";

export class RespriteImportError extends Error {
  constructor(
    readonly code: RespriteImportErrorCode,
    message: string,
    options: ErrorOptions = {},
  ) {
    super(message, options);
    this.name = "RespriteImportError";
  }
}

/** Returns importer-authored detail only; arbitrary thrown values stay private. */
export function getRespriteImportDiagnostic(error: unknown): string | null {
  return error instanceof RespriteImportError ? error.message : null;
}

export type RespriteImportDependencies = {
  decodePng?: (pngBytes: Uint8Array) => Promise<ImageData>;
  inflateRaw?: (
    compressed: Uint8Array,
    maximumOutputBytes: number,
  ) => Promise<Uint8Array>;
};

type ZipEntry = {
  content: Uint8Array;
  isDirectory: boolean;
  name: string;
};

type CentralDirectoryEntry = {
  compressedSize: number;
  compressionMethod: number;
  crc: number;
  flags: number;
  localHeaderOffset: number;
  name: string;
  uncompressedSize: number;
};

type ParsedCentralDirectory = {
  centralDirectoryOffset: number;
  entries: CentralDirectoryEntry[];
};

type JsonRecord = Record<string, unknown>;

function fail(code: RespriteImportErrorCode, message: string): never {
  throw new RespriteImportError(code, message);
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] +
    bytes[offset + 1] * 0x100 +
    bytes[offset + 2] * 0x10000 +
    bytes[offset + 3] * 0x1000000
  ) >>> 0;
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function requireRange(
  bytes: Uint8Array,
  offset: number,
  length: number,
  message: string,
): void {
  if (offset < 0 || length < 0 || offset > bytes.length - length) {
    fail("invalid-container", message);
  }
}

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

function decodeUtf8(bytes: Uint8Array, description: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new RespriteImportError(
      "invalid-container",
      `${description} must be valid UTF-8.`,
      { cause: error },
    );
  }
}

function isUnsafePath(path: string, allowDirectory: boolean): boolean {
  if (
    path.length === 0 ||
    path.length > MAX_PATH_LENGTH ||
    path.includes("\0") ||
    path.includes("\\") ||
    path.startsWith("/") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(path)
  ) {
    return true;
  }
  if (!allowDirectory && path.endsWith("/")) return true;
  const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
  return normalized.length === 0 || normalized
    .split("/")
    .some((part) => part.length === 0 || part === "." || part === "..");
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  if (bytes.length < 22) {
    fail("invalid-container", "ReSprite bundle ZIP directory is missing.");
  }
  const minimumOffset = Math.max(0, bytes.length - 22 - 0xffff);
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (readUint32LE(bytes, offset) !== ZIP_END_OF_CENTRAL_DIRECTORY) continue;
    const commentLength = readUint16LE(bytes, offset + 20);
    if (offset + 22 + commentLength === bytes.length) return offset;
  }
  fail("invalid-container", "ReSprite bundle ZIP directory is missing.");
}

function parseCentralDirectory(bytes: Uint8Array): ParsedCentralDirectory {
  const endOffset = findEndOfCentralDirectory(bytes);
  const diskNumber = readUint16LE(bytes, endOffset + 4);
  const centralDirectoryDisk = readUint16LE(bytes, endOffset + 6);
  const diskEntryCount = readUint16LE(bytes, endOffset + 8);
  const entryCount = readUint16LE(bytes, endOffset + 10);
  const centralDirectorySize = readUint32LE(bytes, endOffset + 12);
  const centralDirectoryOffset = readUint32LE(bytes, endOffset + 16);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || diskEntryCount !== entryCount) {
    fail("unsupported-zip", "ReSprite bundles must not use multi-disk ZIP layout.");
  }
  if (entryCount === 0xffff || centralDirectorySize === ZIP64_SENTINEL) {
    fail("unsupported-zip", "ZIP64 ReSprite bundles are unsupported.");
  }
  if (entryCount === 0 || entryCount > MAX_ZIP_ENTRIES) {
    fail(
      "allocation-limit",
      `ReSprite bundle entry count must be from 1 through ${MAX_ZIP_ENTRIES}.`,
    );
  }
  if (centralDirectoryOffset > endOffset || centralDirectorySize > endOffset - centralDirectoryOffset) {
    fail("invalid-container", "ReSprite bundle ZIP directory is outside the archive.");
  }

  const entries: CentralDirectoryEntry[] = [];
  const names = new Set<string>();
  let totalUncompressedBytes = 0;
  let offset = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  for (let index = 0; index < entryCount; index += 1) {
    requireRange(bytes, offset, 46, "ReSprite bundle ZIP directory is truncated.");
    if (readUint32LE(bytes, offset) !== ZIP_CENTRAL_DIRECTORY_HEADER) {
      fail("invalid-container", "ReSprite bundle ZIP directory is malformed.");
    }
    const flags = readUint16LE(bytes, offset + 8);
    const compressionMethod = readUint16LE(bytes, offset + 10);
    const crc = readUint32LE(bytes, offset + 16);
    const compressedSize = readUint32LE(bytes, offset + 20);
    const uncompressedSize = readUint32LE(bytes, offset + 24);
    const nameLength = readUint16LE(bytes, offset + 28);
    const extraLength = readUint16LE(bytes, offset + 30);
    const commentLength = readUint16LE(bytes, offset + 32);
    const localHeaderOffset = readUint32LE(bytes, offset + 42);
    const recordLength = 46 + nameLength + extraLength + commentLength;
    requireRange(bytes, offset, recordLength, "ReSprite bundle ZIP directory is truncated.");

    if (
      compressedSize === ZIP64_SENTINEL ||
      uncompressedSize === ZIP64_SENTINEL ||
      localHeaderOffset === ZIP64_SENTINEL
    ) {
      fail("unsupported-zip", "ZIP64 ReSprite bundle entries are unsupported.");
    }
    if ((flags & ZIP_FLAG_ENCRYPTED) !== 0) {
      fail("unsupported-zip", "Encrypted ReSprite bundle entries are unsupported.");
    }
    if (compressionMethod !== ZIP_STORED && compressionMethod !== ZIP_DEFLATED) {
      fail(
        "unsupported-zip",
        `ReSprite bundle entry uses unsupported compression method ${compressionMethod}.`,
      );
    }
    if (uncompressedSize > MAX_ENTRY_BYTES) {
      fail("allocation-limit", `ReSprite bundle entry exceeds ${MAX_ENTRY_BYTES} bytes.`);
    }
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > MAX_ARCHIVE_OUTPUT_BYTES) {
      fail(
        "allocation-limit",
        `ReSprite bundle expands beyond ${MAX_ARCHIVE_OUTPUT_BYTES} bytes.`,
      );
    }

    const name = decodeUtf8(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
      "ReSprite bundle entry name",
    );
    if (isUnsafePath(name, true)) {
      fail("unsafe-path", `ReSprite bundle entry ${JSON.stringify(name)} is unsafe.`);
    }
    if (names.has(name)) {
      fail("invalid-container", `ReSprite bundle repeats entry ${JSON.stringify(name)}.`);
    }
    names.add(name);
    entries.push({
      compressedSize,
      compressionMethod,
      crc,
      flags,
      localHeaderOffset,
      name,
      uncompressedSize,
    });
    offset += recordLength;
  }

  if (offset !== centralDirectoryEnd) {
    fail("invalid-container", "ReSprite bundle ZIP directory size is inconsistent.");
  }
  return {
    centralDirectoryOffset,
    entries: entries.sort((left, right) => left.localHeaderOffset - right.localHeaderOffset),
  };
}

async function inflateRawInBrowser(
  compressed: Uint8Array,
  maximumOutputBytes: number,
): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function") {
    fail("browser-unsupported", "This browser cannot decompress ReSprite bundles locally.");
  }
  const stream = new Blob([new Uint8Array(compressed)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const output = new Uint8Array(maximumOutputBytes);
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return output.subarray(0, length);
    if (length + value.length > maximumOutputBytes) {
      await reader.cancel();
      fail("invalid-container", "A ReSprite bundle entry expands beyond its declared size.");
    }
    output.set(value, length);
    length += value.length;
  }
}

async function readZipArchive(
  bytes: Uint8Array,
  dependencies: RespriteImportDependencies,
): Promise<Map<string, ZipEntry>> {
  const { centralDirectoryOffset, entries: centralEntries } = parseCentralDirectory(bytes);
  const inflateRaw = dependencies.inflateRaw ?? inflateRawInBrowser;
  const entries = new Map<string, ZipEntry>();

  for (const [index, entry] of centralEntries.entries()) {
    requireRange(bytes, entry.localHeaderOffset, 30, "ReSprite ZIP header is truncated.");
    if (readUint32LE(bytes, entry.localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER) {
      fail("invalid-container", "ReSprite ZIP header is malformed.");
    }
    const localFlags = readUint16LE(bytes, entry.localHeaderOffset + 6);
    const localCompressionMethod = readUint16LE(bytes, entry.localHeaderOffset + 8);
    const localNameLength = readUint16LE(bytes, entry.localHeaderOffset + 26);
    const localExtraLength = readUint16LE(bytes, entry.localHeaderOffset + 28);
    const nameOffset = entry.localHeaderOffset + 30;
    const dataOffset = nameOffset + localNameLength + localExtraLength;
    const dataEnd = dataOffset + entry.compressedSize;
    const nextHeaderOffset = centralEntries[index + 1]?.localHeaderOffset ?? centralDirectoryOffset;
    requireRange(bytes, nameOffset, localNameLength, "ReSprite ZIP header is truncated.");
    requireRange(bytes, dataOffset, entry.compressedSize, "ReSprite ZIP data is truncated.");
    if (dataEnd > nextHeaderOffset) {
      fail("invalid-container", "ReSprite ZIP entries overlap.");
    }
    if (localFlags !== entry.flags || localCompressionMethod !== entry.compressionMethod) {
      fail("invalid-container", "ReSprite ZIP local and central metadata differ.");
    }
    const localName = decodeUtf8(
      bytes.subarray(nameOffset, nameOffset + localNameLength),
      "ReSprite ZIP local entry name",
    );
    if (localName !== entry.name) {
      fail("invalid-container", "ReSprite ZIP local and central names differ.");
    }

    const compressed = bytes.subarray(dataOffset, dataEnd);
    let content: Uint8Array;
    if (
      entry.name.endsWith("/") &&
      entry.compressedSize === 0 &&
      entry.uncompressedSize === 0
    ) {
      // Genuine ReSprite bundles can mark empty directory records as DEFLATED
      // while storing no DEFLATE payload. Directory bytes are never consumed.
      content = new Uint8Array(0);
    } else if (entry.compressionMethod === ZIP_STORED) {
      if (compressed.length !== entry.uncompressedSize) {
        fail("invalid-container", `ReSprite entry ${JSON.stringify(entry.name)} has an invalid size.`);
      }
      content = compressed.slice();
    } else {
      try {
        content = await inflateRaw(compressed, entry.uncompressedSize);
      } catch (error) {
        if (error instanceof RespriteImportError) throw error;
        throw new RespriteImportError(
          "invalid-container",
          `Could not decompress ReSprite entry ${JSON.stringify(entry.name)}.`,
          { cause: error },
        );
      }
    }
    if (!(content instanceof Uint8Array) || content.length !== entry.uncompressedSize) {
      fail("invalid-container", `ReSprite entry ${JSON.stringify(entry.name)} has an invalid output size.`);
    }
    if (crc32(content) !== entry.crc) {
      fail("invalid-container", `ReSprite entry ${JSON.stringify(entry.name)} has an invalid CRC.`);
    }
    entries.set(entry.name, {
      content,
      isDirectory: entry.name.endsWith("/"),
      name: entry.name,
    });
  }
  return entries;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) fail("invalid-document", `${path} must be an object.`);
  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail("invalid-document", `${path} must be an array.`);
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail("invalid-document", `${path} must be a boolean.`);
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("invalid-document", `${path} must be a finite number.`);
  }
  return value;
}

function requireInteger(value: unknown, path: string): number {
  const number = requireNumber(value, path);
  if (!Number.isInteger(number)) fail("invalid-document", `${path} must be an integer.`);
  return number;
}

function requireString(value: unknown, path: string, allowEmpty = false): string {
  if (
    typeof value !== "string" ||
    value.length > MAX_STRING_LENGTH ||
    (!allowEmpty && value.trim().length === 0)
  ) {
    fail("invalid-document", `${path} must be a valid string.`);
  }
  return value;
}

function requireRangeNumber(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  const number = requireNumber(value, path);
  if (number < minimum || number > maximum) {
    fail("invalid-document", `${path} must be from ${minimum} through ${maximum}.`);
  }
  return number;
}

function requireEntry(entries: Map<string, ZipEntry>, name: string): ZipEntry {
  const entry = entries.get(name);
  if (entry === undefined || entry.isDirectory) {
    fail("missing-entry", `ReSprite bundle is missing ${JSON.stringify(name)}.`);
  }
  return entry;
}

function findBundleRoot(entries: Map<string, ZipEntry>): string {
  const roots = [...entries.keys()]
    .map((name) => /^([^/]+\.resprite)\/document\.json$/u.exec(name)?.[1])
    .filter((root): root is string => root !== undefined);
  if (roots.length !== 1) {
    fail("invalid-container", "ReSprite bundle must contain one .resprite/document.json root.");
  }
  return roots[0];
}

function parseJsonEntry(entry: ZipEntry, description: string): JsonRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeUtf8(entry.content, description));
  } catch (error) {
    if (error instanceof RespriteImportError) throw error;
    throw new RespriteImportError(
      "invalid-document",
      `${description} must contain valid JSON.`,
      { cause: error },
    );
  }
  return requireRecord(parsed, description);
}

function readPngMetadata(bytes: Uint8Array, path: string): { height: number; width: number } {
  if (
    bytes.length < 33 ||
    !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte) ||
    readUint32BE(bytes, 8) !== 13 ||
    decodeUtf8(bytes.subarray(12, 16), `${path} PNG chunk type`) !== "IHDR"
  ) {
    fail("invalid-png", `${path} must be a PNG with a valid IHDR chunk.`);
  }
  const width = readUint32BE(bytes, 16);
  const height = readUint32BE(bytes, 20);
  if (width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    fail("invalid-png", `${path} dimensions are outside the supported range.`);
  }
  return { height, width };
}

function isValidDecodedImage(
  image: unknown,
  expectedWidth: number,
  expectedHeight: number,
): image is ImageData {
  if (typeof image !== "object" || image === null) return false;
  const candidate = image as Partial<ImageData>;
  return (
    candidate.width === expectedWidth &&
    candidate.height === expectedHeight &&
    candidate.data instanceof Uint8ClampedArray &&
    candidate.data.length === expectedWidth * expectedHeight * 4
  );
}

async function decodePngInBrowser(pngBytes: Uint8Array): Promise<ImageData> {
  const bitmap = await createImageBitmap(
    new Blob([new Uint8Array(pngBytes)], { type: "image/png" }),
  );
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) throw new Error("A canvas context is required.");
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

function parseFrameTags(frameDatas: unknown[]): SpriteFrameTag[] {
  const heads: Array<{ direction: SpriteFrameTag["direction"]; from: number; name: string }> = [];
  const directions: Record<string, SpriteFrameTag["direction"]> = {
    Forward: "forward",
    Reverse: "reverse",
    PingPong: "ping-pong",
  };
  for (const [index, value] of frameDatas.entries()) {
    const frame = requireRecord(value, `document.frameDatas[${index}]`);
    const isClipHead = requireBoolean(
      frame.isClipHead,
      `document.frameDatas[${index}].isClipHead`,
    );
    requireRangeNumber(frame.duration, `document.frameDatas[${index}].duration`, 0.001, 65_535);
    if (!isClipHead) continue;
    const name = requireString(frame.clipName, `document.frameDatas[${index}].clipName`);
    const clipDirection = requireString(
      frame.clipDir,
      `document.frameDatas[${index}].clipDir`,
    );
    const direction = directions[clipDirection];
    if (direction === undefined) {
      fail("unsupported-feature", `ReSprite clip direction ${JSON.stringify(clipDirection)} is unsupported.`);
    }
    heads.push({ direction, from: index, name });
  }
  return heads.map((head, index) => ({
    ...head,
    to: (heads[index + 1]?.from ?? frameDatas.length) - 1,
  }));
}

function parseCanvas(document: JsonRecord): { height: number; width: number } {
  const canvas = requireRecord(document.canvasSize, "document.canvasSize");
  const width = requireInteger(canvas.width, "document.canvasSize.width");
  const height = requireInteger(canvas.height, "document.canvasSize.height");
  if (
    width < 1 ||
    height < 1 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    width * height > MAX_CANVAS_PIXELS
  ) {
    fail("allocation-limit", "ReSprite canvas dimensions exceed the browser-local import limit.");
  }
  return { height, width };
}

async function parseLayers(
  entries: Map<string, ZipEntry>,
  root: string,
  layerDatas: unknown[],
  frameCount: number,
  decodePng: (pngBytes: Uint8Array) => Promise<ImageData>,
): Promise<SpriteProject["layers"]> {
  if (layerDatas.length < 1 || layerDatas.length > MAX_LAYERS) {
    fail("allocation-limit", `ReSprite layer count must be from 1 through ${MAX_LAYERS}.`);
  }
  if (layerDatas.length * frameCount > MAX_CELS) {
    fail("allocation-limit", `ReSprite bundle exceeds the ${MAX_CELS}-cel import limit.`);
  }
  const layers: SpriteProject["layers"] = [];
  let totalCelPixels = 0;

  for (const [layerIndex, value] of layerDatas.entries()) {
    const path = `document.layerDatas[${layerIndex}]`;
    const layer = requireRecord(value, path);
    if (requireBoolean(layer.isGroup, `${path}.isGroup`)) {
      fail("unsupported-feature", `ReSprite layer ${layerIndex + 1} is a group, which is unsupported.`);
    }
    if (requireBoolean(layer.isClippingMask, `${path}.isClippingMask`)) {
      fail("unsupported-feature", `ReSprite layer ${layerIndex + 1} uses a clipping mask, which is unsupported.`);
    }
    const blendMode = requireString(layer.blendMode, `${path}.blendMode`);
    if (blendMode !== "bm-normal") {
      fail("unsupported-feature", `ReSprite blend mode ${JSON.stringify(blendMode)} is unsupported.`);
    }
    const opacity = requireRangeNumber(layer.opacity, `${path}.opacity`, 0, 1);
    const cells = requireArray(layer.cells, `${path}.cells`);
    if (cells.length !== frameCount) {
      fail("invalid-document", `${path}.cells must contain exactly ${frameCount} frame entries.`);
    }

    const outputCels: SpriteCel[] = [];
    let previousCel: Omit<SpriteCel, "frameIndex"> | null = null;
    for (const [frameIndex, cellValue] of cells.entries()) {
      const cellPath = `${path}.cells[${frameIndex}]`;
      const cell = requireRecord(cellValue, cellPath);
      requireString(cell.id, `${cellPath}.id`);
      const inherit = requireBoolean(cell.inherit, `${cellPath}.inherit`);
      const cellOpacity = requireRangeNumber(cell.opacity, `${cellPath}.opacity`, 0, 1);
      if (cellOpacity !== 1) {
        fail("unsupported-feature", `ReSprite cel opacity on layer ${layerIndex + 1}, frame ${frameIndex + 1} is unsupported.`);
      }
      const bounds = requireRecord(cell.bounds, `${cellPath}.bounds`);
      const origin = requireRecord(bounds.origin, `${cellPath}.bounds.origin`);
      const size = requireRecord(bounds.size, `${cellPath}.bounds.size`);
      const x = requireInteger(origin.x, `${cellPath}.bounds.origin.x`);
      const y = requireInteger(origin.y, `${cellPath}.bounds.origin.y`);
      const cellWidth = requireInteger(size.width, `${cellPath}.bounds.size.width`);
      const cellHeight = requireInteger(size.height, `${cellPath}.bounds.size.height`);
      if (x < INT16_MIN || x > INT16_MAX || y < INT16_MIN || y > INT16_MAX) {
        fail("unsupported-feature", `ReSprite cel position on layer ${layerIndex + 1}, frame ${frameIndex + 1} is outside Aseprite's range.`);
      }

      if (inherit) {
        if (frameIndex === 0) {
          fail("invalid-document", `${cellPath} cannot inherit before the first frame.`);
        }
        if (cellWidth !== 0 || cellHeight !== 0) {
          fail("invalid-document", `${cellPath} inherited bounds must be empty.`);
        }
        if (previousCel !== null) outputCels.push({ ...previousCel, frameIndex });
        continue;
      }

      if (cellWidth === 0 && cellHeight === 0) {
        previousCel = null;
        continue;
      }
      if (
        cellWidth < 1 ||
        cellHeight < 1 ||
        cellWidth > MAX_DIMENSION ||
        cellHeight > MAX_DIMENSION
      ) {
        fail("allocation-limit", `${cellPath} dimensions exceed the supported range.`);
      }
      totalCelPixels += cellWidth * cellHeight;
      if (totalCelPixels > MAX_TOTAL_CEL_PIXELS) {
        fail("allocation-limit", "ReSprite decoded cel pixels exceed the browser-local import limit.");
      }
      const id = requireString(cell.id, `${cellPath}.id`);
      if (!/^[A-Za-z0-9_-]{1,128}$/u.test(id)) {
        fail("unsafe-path", `${cellPath}.id cannot be used as a safe cel filename.`);
      }
      const pngPath = `${root}/CellData/${id}.png`;
      const pngEntry = requireEntry(entries, pngPath);
      const metadata = readPngMetadata(pngEntry.content, pngPath);
      if (metadata.width !== cellWidth || metadata.height !== cellHeight) {
        fail("invalid-png", `${pngPath} dimensions do not match ${cellPath}.bounds.`);
      }
      let imageData: ImageData;
      try {
        imageData = await decodePng(pngEntry.content);
      } catch (error) {
        throw new RespriteImportError(
          "browser-image-decode",
          `Could not decode ReSprite cel PNG for layer ${layerIndex + 1}, frame ${frameIndex + 1}.`,
          { cause: error },
        );
      }
      if (!isValidDecodedImage(imageData, cellWidth, cellHeight)) {
        fail("invalid-png", `${pngPath} did not decode to the expected RGBA dimensions.`);
      }
      previousCel = { imageData, x, y };
      outputCels.push({ ...previousCel, frameIndex });
    }

    layers.push({
      cels: outputCels,
      id: `resprite-layer-${layerIndex}`,
      name: requireString(layer.name, `${path}.name`),
      opacity: Math.round(opacity * 255),
      visible: requireBoolean(layer.contentVisible, `${path}.contentVisible`),
    });
  }
  return layers.reverse();
}

/** Imports the validated normal-raster ReSprite bundle subset locally. */
export async function importRespriteBytes(
  bytes: Uint8Array,
  dependencies: RespriteImportDependencies = {},
): Promise<SpriteProject> {
  if (bytes.byteLength > MAX_RESPRITE_FILE_BYTES) {
    fail("file-too-large", `ReSprite file exceeds the ${MAX_RESPRITE_FILE_BYTES}-byte import limit.`);
  }
  const entries = await readZipArchive(bytes, dependencies);
  const root = findBundleRoot(entries);
  const documentEntry = requireEntry(entries, `${root}/document.json`);
  if (documentEntry.content.length > MAX_DOCUMENT_JSON_BYTES) {
    fail("allocation-limit", `ReSprite document.json exceeds ${MAX_DOCUMENT_JSON_BYTES} bytes.`);
  }
  const document = parseJsonEntry(documentEntry, "ReSprite document.json");
  const meta = parseJsonEntry(requireEntry(entries, `${root}/meta.json`), "ReSprite meta.json");
  const { height, width } = parseCanvas(document);
  const frameCount = requireInteger(document.frameCount, "document.frameCount");
  if (frameCount < 1 || frameCount > MAX_FRAMES) {
    fail("allocation-limit", `ReSprite frame count must be from 1 through ${MAX_FRAMES}.`);
  }
  const frameRate = requireRangeNumber(document.frameRate, "document.frameRate", 0.001, 1000);
  const frameDatas = requireArray(document.frameDatas, "document.frameDatas");
  if (frameDatas.length !== frameCount) {
    fail("invalid-document", "document.frameDatas length must match document.frameCount.");
  }
  const metaCanvas = requireRecord(meta.canvasSize, "meta.canvasSize");
  if (
    requireInteger(metaCanvas.width, "meta.canvasSize.width") !== width ||
    requireInteger(metaCanvas.height, "meta.canvasSize.height") !== height ||
    requireInteger(meta.frameCount, "meta.frameCount") !== frameCount
  ) {
    fail("invalid-document", "ReSprite meta.json does not match document.json.");
  }

  const frames = frameDatas.map((value, index) => {
    const frame = requireRecord(value, `document.frameDatas[${index}]`);
    const durationUnits = requireRangeNumber(
      frame.duration,
      `document.frameDatas[${index}].duration`,
      0.001,
      65_535,
    );
    return {
      durationMs: normalizeFrameDurationMs(Math.floor(durationUnits * 1000 / frameRate)),
      index,
    };
  });
  const frameTags = parseFrameTags(frameDatas);
  const layers = await parseLayers(
    entries,
    root,
    requireArray(document.layerDatas, "document.layerDatas"),
    frameCount,
    dependencies.decodePng ?? decodePngInBrowser,
  );

  return {
    colorMode: "rgba",
    frameTags,
    frames,
    height,
    layers,
    width,
  };
}

/** Reads a browser-selected .resprite bundle without uploading it. */
export async function importResprite(
  file: File,
  dependencies: RespriteImportDependencies = {},
): Promise<SpriteProject> {
  if (file.size > MAX_RESPRITE_FILE_BYTES) {
    fail("file-too-large", `ReSprite file exceeds the ${MAX_RESPRITE_FILE_BYTES}-byte import limit.`);
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    throw new RespriteImportError("file-read", "Could not read the selected ReSprite file.", {
      cause: error,
    });
  }
  return importRespriteBytes(bytes, dependencies);
}
