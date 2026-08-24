import type { SpriteProject } from "../SpriteProject";
import { validateSpriteProject } from "../validation";

const MAX_RASTER_PIXELS = 16_777_216;

function createImageData(width: number, height: number): ImageData {
  return {
    colorSpace: "srgb",
    data: new Uint8ClampedArray(width * height * 4),
    height,
    width,
  };
}

function assertRenderable(project: SpriteProject, frameIndex: number): void {
  const errors = validateSpriteProject(project);
  if (errors.length > 0) {
    throw new TypeError(`Cannot render an invalid SpriteProject: ${errors[0].path}: ${errors[0].message}`);
  }
  if (!project.frames.some((frame) => frame.index === frameIndex)) {
    throw new RangeError(`Frame index ${frameIndex} does not exist.`);
  }
  if (project.width > Math.floor(MAX_RASTER_PIXELS / project.height)) {
    throw new RangeError(`Rendered frame exceeds the ${MAX_RASTER_PIXELS}-pixel browser-local limit.`);
  }
}

/**
 * Flattens one frame to a transparent RGBA canvas. SpriteProject layers are
 * ordered back-to-front, matching Aseprite's layer chunk order.
 */
export function compositeFrame(project: SpriteProject, frameIndex: number): ImageData {
  assertRenderable(project, frameIndex);
  const output = createImageData(project.width, project.height);

  for (const layer of project.layers) {
    if (!layer.visible || layer.opacity === 0) continue;
    const cel = layer.cels.find((candidate) => candidate.frameIndex === frameIndex);
    if (cel === undefined) continue;

    const startX = Math.max(0, cel.x);
    const startY = Math.max(0, cel.y);
    const endX = Math.min(project.width, cel.x + cel.imageData.width);
    const endY = Math.min(project.height, cel.y + cel.imageData.height);
    if (startX >= endX || startY >= endY) continue;

    for (let destinationY = startY; destinationY < endY; destinationY += 1) {
      const sourceY = destinationY - cel.y;
      for (let destinationX = startX; destinationX < endX; destinationX += 1) {
        const sourceX = destinationX - cel.x;
        const sourceOffset = (sourceY * cel.imageData.width + sourceX) * 4;
        const destinationOffset = (destinationY * project.width + destinationX) * 4;
        const sourceAlphaScaled = cel.imageData.data[sourceOffset + 3] * layer.opacity;
        if (sourceAlphaScaled === 0) continue;

        const destinationAlpha = output.data[destinationOffset + 3];
        const denominator =
          sourceAlphaScaled * 255 + destinationAlpha * (65_025 - sourceAlphaScaled);
        if (denominator === 0) continue;

        for (let channel = 0; channel < 3; channel += 1) {
          output.data[destinationOffset + channel] = Math.round(
            (cel.imageData.data[sourceOffset + channel] * sourceAlphaScaled * 255 +
              output.data[destinationOffset + channel] * destinationAlpha *
                (65_025 - sourceAlphaScaled)) /
              denominator,
          );
        }
        output.data[destinationOffset + 3] = Math.round(denominator / 65_025);
      }
    }
  }

  return output;
}

export function compositeProjectFrames(project: SpriteProject): ImageData[] {
  return project.frames.map((frame) => compositeFrame(project, frame.index));
}
