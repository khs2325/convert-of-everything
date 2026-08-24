import type { SpriteProject } from "../../SpriteProject";
import { compositeFrame } from "../../rendering/composite";
import { validateSpriteProject } from "../../validation";
import { encodeRgbaPng } from "../png";

export type ExportedFile = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

const MAX_AGGREGATE_FRAME_PIXELS = 67_108_864;

function assertSequenceSize(project: SpriteProject): void {
  const errors = validateSpriteProject(project);
  if (errors.length > 0) {
    throw new TypeError(`Cannot export an invalid SpriteProject: ${errors[0].path}: ${errors[0].message}`);
  }
  const pixelsPerFrame = project.width * project.height;
  if (
    !Number.isSafeInteger(pixelsPerFrame) ||
    pixelsPerFrame > Math.floor(MAX_AGGREGATE_FRAME_PIXELS / project.frames.length)
  ) {
    throw new RangeError(
      `PNG sequence exceeds the ${MAX_AGGREGATE_FRAME_PIXELS}-pixel aggregate browser-local limit.`,
    );
  }
}

export function sanitizeFilenameStem(value: string): string {
  const stem = value
    .trim()
    .replace(/\.(?:ase|aseprite|png|json)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^\.+/g, "")
    .replace(/-+/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 96);
  return stem.length > 0 ? stem : "sprite-project";
}

export function exportPngSequence(
  project: SpriteProject,
  filenameStem = "sprite-project",
): ExportedFile[] {
  assertSequenceSize(project);
  const stem = sanitizeFilenameStem(filenameStem);
  const digits = Math.max(4, String(project.frames.length).length);
  return project.frames.map((frame, index) => ({
    bytes: encodeRgbaPng(compositeFrame(project, frame.index)),
    filename: `${stem}-frame-${String(index + 1).padStart(digits, "0")}.png`,
    mimeType: "image/png",
  }));
}
