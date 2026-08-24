import type { SpriteProject } from "../../SpriteProject";
import { compositeFrame } from "../../rendering/composite";
import { validateSpriteProject } from "../../validation";
import { encodeRgbaPng } from "../png";
import { sanitizeFilenameStem, type ExportedFile } from "../pngSequence";

const MAX_SHEET_PIXELS = 16_777_216;

export type SpritesheetExport = {
  columns: number;
  rows: number;
  imageFile: ExportedFile;
  jsonFile: ExportedFile;
};

export type SpritesheetExportOptions = {
  columns?: number;
  filenameStem?: string;
};

export function exportSpritesheet(
  project: SpriteProject,
  options: SpritesheetExportOptions = {},
): SpritesheetExport {
  const errors = validateSpriteProject(project);
  if (errors.length > 0) {
    throw new TypeError(`Cannot export an invalid SpriteProject: ${errors[0].path}: ${errors[0].message}`);
  }
  const frameCount = project.frames.length;
  const columns = options.columns ?? Math.ceil(Math.sqrt(frameCount));
  if (!Number.isInteger(columns) || columns < 1 || columns > frameCount) {
    throw new RangeError(`Spritesheet columns must be an integer from 1 to ${frameCount}.`);
  }
  const rows = Math.ceil(frameCount / columns);
  const sheetWidth = project.width * columns;
  const sheetHeight = project.height * rows;
  if (
    !Number.isSafeInteger(sheetWidth) ||
    !Number.isSafeInteger(sheetHeight) ||
    sheetWidth > 65_535 ||
    sheetHeight > 65_535 ||
    sheetWidth > Math.floor(MAX_SHEET_PIXELS / sheetHeight)
  ) {
    throw new RangeError(`Spritesheet exceeds the ${MAX_SHEET_PIXELS}-pixel browser-local limit.`);
  }

  const pixels = new Uint8ClampedArray(sheetWidth * sheetHeight * 4);
  const stem = sanitizeFilenameStem(options.filenameStem ?? "sprite-project");
  const imageName = `${stem}-sheet.png`;
  const frameRecords = project.frames.map((projectFrame, index) => {
    const frame = compositeFrame(project, projectFrame.index);
    const x = (index % columns) * project.width;
    const y = Math.floor(index / columns) * project.height;
    for (let row = 0; row < project.height; row += 1) {
      const sourceStart = row * project.width * 4;
      const destinationStart = ((y + row) * sheetWidth + x) * 4;
      pixels.set(frame.data.subarray(sourceStart, sourceStart + project.width * 4), destinationStart);
    }
    return {
      filename: `${stem}-${String(index + 1).padStart(4, "0")}.png`,
      frame: { x, y, w: project.width, h: project.height },
      rotated: false,
      trimmed: false,
      duration: projectFrame.durationMs,
    };
  });

  const metadata = {
    frames: frameRecords,
    meta: {
      app: "Convert of Everything / Aseprite-compatible",
      version: "1",
      image: imageName,
      format: "RGBA8888",
      size: { w: sheetWidth, h: sheetHeight },
      scale: "1",
      frameTags: (project.frameTags ?? []).map((tag) => ({
        name: tag.name,
        from: tag.from,
        to: tag.to,
        direction: tag.direction === "ping-pong" ? "pingpong" : tag.direction,
      })),
    },
  };
  const jsonBytes = new TextEncoder().encode(`${JSON.stringify(metadata, null, 2)}\n`);

  return {
    columns,
    rows,
    imageFile: {
      bytes: encodeRgbaPng({ colorSpace: "srgb", data: pixels, height: sheetHeight, width: sheetWidth }),
      filename: imageName,
      mimeType: "image/png",
    },
    jsonFile: {
      bytes: jsonBytes,
      filename: `${stem}-sheet.json`,
      mimeType: "application/json",
    },
  };
}
