import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { encodeRgbaPng } from ".";

function chunks(bytes: Uint8Array): Map<string, Uint8Array> {
  const result = new Map<string, Uint8Array>();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset < bytes.length) {
    const length = view.getUint32(offset, false);
    const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));
    result.set(type, bytes.slice(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  return result;
}

describe("encodeRgbaPng", () => {
  it("writes deterministic 8-bit RGBA PNG scanlines", () => {
    const input: ImageData = {
      colorSpace: "srgb",
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 128]),
      height: 1,
      width: 2,
    };
    const first = encodeRgbaPng(input);
    const second = encodeRgbaPng(input);
    expect(first).toEqual(second);
    expect([...first.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const parsed = chunks(first);
    expect([...parsed.keys()]).toEqual(["IHDR", "IDAT", "IEND"]);
    expect([...inflateSync(parsed.get("IDAT")!)]).toEqual([0, ...input.data]);
  });

  it("rejects malformed RGBA input", () => {
    expect(() => encodeRgbaPng({
      colorSpace: "srgb",
      data: new Uint8ClampedArray(3),
      height: 1,
      width: 1,
    })).toThrow("width × height × 4");
  });
});
