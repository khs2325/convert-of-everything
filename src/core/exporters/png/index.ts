const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_RASTER_PIXELS = 16_777_216;
const UINT32_MAX = 0xffff_ffff;

function writeUint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

function crc32(bytes: Uint8Array): number {
  let crc = UINT32_MAX;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) === 0 ? 0 : 0xedb8_8320);
    }
  }
  return (crc ^ UINT32_MAX) >>> 0;
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

function storedZlib(bytes: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  if (bytes.length === 0) {
    parts.push(new Uint8Array([1, 0, 0, 255, 255]));
  } else {
    for (let offset = 0; offset < bytes.length; offset += 65_535) {
      const length = Math.min(65_535, bytes.length - offset);
      const block = new Uint8Array(5 + length);
      block[0] = offset + length === bytes.length ? 1 : 0;
      block[1] = length & 0xff;
      block[2] = length >>> 8;
      const inverse = 0xffff - length;
      block[3] = inverse & 0xff;
      block[4] = inverse >>> 8;
      block.set(bytes.subarray(offset, offset + length), 5);
      parts.push(block);
    }
  }
  parts.push(writeUint32(adler32(bytes)));
  return concat(parts);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = concat([typeBytes, data]);
  return concat([writeUint32(data.length), body, writeUint32(crc32(body))]);
}

export function encodeRgbaPng(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError("PNG width and height must be positive integers.");
  }
  if (width > 65_535 || height > 65_535 || width > Math.floor(MAX_RASTER_PIXELS / height)) {
    throw new RangeError(`PNG exceeds the ${MAX_RASTER_PIXELS}-pixel browser-local limit.`);
  }
  if (!(data instanceof Uint8ClampedArray) || data.length !== width * height * 4) {
    throw new TypeError("PNG input must contain width × height × 4 RGBA bytes.");
  }

  const scanlines = new Uint8Array(height * (1 + width * 4));
  for (let row = 0; row < height; row += 1) {
    const targetOffset = row * (1 + width * 4);
    scanlines[targetOffset] = 0;
    scanlines.set(data.subarray(row * width * 4, (row + 1) * width * 4), targetOffset + 1);
  }
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width, false);
  headerView.setUint32(4, height, false);
  header.set([8, 6, 0, 0, 0], 8);

  return concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", storedZlib(scanlines)),
    chunk("IEND", new Uint8Array()),
  ]);
}
