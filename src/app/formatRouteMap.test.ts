import { describe, expect, it } from "vitest";

import {
  advanceFormatRouteSelection,
  FORMAT_ROUTE_NODES,
  getFormatSurfacePresentation,
  getFormatRoute,
  getFormatRouteLineGeometry,
  offsetFormatGlobeRotation,
  projectFormatSurfacePoint,
  shouldStartFormatGlobeDrag,
  type FormatRouteSelection,
} from "./formatRouteMap";

function node(id: string) {
  const result = FORMAT_ROUTE_NODES.find((item) => item.id === id);
  if (result === undefined) throw new Error(`Missing ${id} node.`);
  return result;
}

describe("format route selection", () => {
  it("starts a new directed route by choosing a source", () => {
    const completed: FormatRouteSelection = {
      sourceId: "png-sequence",
      targetId: "aseprite",
    };
    expect(advanceFormatRouteSelection(completed, node("gif"))).toEqual({
      sourceId: "gif",
      targetId: null,
    });
  });

  it("deselects a selected source when it is clicked again", () => {
    expect(advanceFormatRouteSelection(
      { sourceId: "png-sequence", targetId: "aseprite" },
      node("png-sequence"),
    )).toEqual({ sourceId: null, targetId: null });
    expect(advanceFormatRouteSelection(
      { sourceId: "gif", targetId: null },
      node("gif"),
    )).toEqual({ sourceId: null, targetId: null });
  });

  it("deselects only the selected target when it is clicked again", () => {
    expect(advanceFormatRouteSelection(
      { sourceId: "png-sequence", targetId: "aseprite" },
      node("aseprite"),
    )).toEqual({ sourceId: "png-sequence", targetId: null });
  });

  it("completes the route only with an implemented output node", () => {
    const sourceSelected: FormatRouteSelection = {
      sourceId: "gif",
      targetId: null,
    };
    expect(advanceFormatRouteSelection(sourceSelected, node("pixil"))).toEqual({
      sourceId: "pixil",
      targetId: null,
    });
    const completed = advanceFormatRouteSelection(sourceSelected, node("spritesheet"));
    expect(getFormatRoute(completed)).toMatchObject({
      source: { sourceMode: "gif" },
      target: { outputFormat: "spritesheet" },
    });
  });

  it("maps the dual-purpose Aseprite and PNG nodes in either direction", () => {
    const toPng = getFormatRoute({ sourceId: "aseprite", targetId: "png-sequence" });
    const toAseprite = getFormatRoute({ sourceId: "png-sequence", targetId: "aseprite" });
    expect(toPng).toMatchObject({
      source: { sourceMode: "aseprite" },
      target: { outputFormat: "png-sequence" },
    });
    expect(toAseprite).toMatchObject({
      source: { sourceMode: "png-sequence" },
      target: { outputFormat: "aseprite" },
    });
  });

  it("offers ReSprite as a source for an Aseprite conversion route", () => {
    expect(getFormatRoute({ sourceId: "resprite", targetId: "aseprite" })).toMatchObject({
      source: { label: "ReSprite", sourceMode: "resprite" },
      target: { label: "Aseprite", outputFormat: "aseprite" },
    });
  });

  it("orients the connection line from the source toward the target", () => {
    expect(getFormatRouteLineGeometry(10, 20, 70, 20)).toEqual({
      angleRadians: 0,
      leftPx: 10,
      topPx: 20,
      widthPx: 60,
    });
    expect(getFormatRouteLineGeometry(70, 20, 10, 20)?.angleRadians)
      .toBeCloseTo(Math.PI);
    expect(getFormatRouteLineGeometry(10, 20, 10, 20)).toBeNull();
  });

  it("uses locally hosted official artwork when an official format icon is available", () => {
    expect(node("png-sequence").iconSrc).toBe("/format-icons/png.png");
    expect(node("atlas-json").iconSrc).toBe("/format-icons/json.gif");
    expect(node("piskel").iconSrc).toBe("/format-icons/piskel.png");
    expect(node("pixelorama").iconSrc).toBe("/format-icons/pixelorama.png");
    expect(node("aseprite").iconSrc).toBe("/format-icons/aseprite.png");
    expect(node("spritesheet").iconSrc).toBeUndefined();
  });

  it("projects every format onto the visible bounds of the globe surface", () => {
    for (const item of FORMAT_ROUTE_NODES) {
      const point = projectFormatSurfacePoint(item.position, 22, -47);
      expect(point.leftPercent).toBeGreaterThanOrEqual(15);
      expect(point.leftPercent).toBeLessThanOrEqual(85);
      expect(point.topPercent).toBeGreaterThanOrEqual(15);
      expect(point.topPercent).toBeLessThanOrEqual(85);
      expect(Math.hypot(
        point.leftPercent - 50,
        point.topPercent - 50,
      )).toBeLessThanOrEqual(35);
      expect(point.depth).toBeGreaterThanOrEqual(-1);
      expect(point.depth).toBeLessThanOrEqual(1);
    }
  });

  it("moves a surface format from the front to the compact back side when rotated", () => {
    const front = projectFormatSurfacePoint(1, 0, 0);
    const back = projectFormatSurfacePoint(1, 0, 180);

    expect(front.isBack).toBe(false);
    expect(front.depth).toBeGreaterThan(0);
    expect(back.isBack).toBe(true);
    expect(back.depth).toBeLessThan(0);
    expect(back.scale).toBeLessThan(front.scale);
  });

  it("lifts selected formats equally on the front and back surfaces", () => {
    const front = projectFormatSurfacePoint(1, 0, 0);
    const back = projectFormatSurfacePoint(1, 0, 180);

    expect(getFormatSurfacePresentation(front, true, false)).toEqual({
      opacity: 1,
      zIndex: 22,
    });
    expect(getFormatSurfacePresentation(back, true, false)).toEqual({
      opacity: 1,
      zIndex: 22,
    });
    expect(getFormatSurfacePresentation(back, false, false).opacity).toBe(0.72);
    expect(getFormatSurfacePresentation(back, false, true).opacity).toBeCloseTo(0.1596);
  });

  it("allows rotation to continue past a full turn on both axes", () => {
    expect(offsetFormatGlobeRotation(350, -355, 40, -20)).toEqual({
      rotationXDegrees: 390,
      rotationYDegrees: -375,
    });
    const fullTurns = projectFormatSurfacePoint(1, 720, -720);
    const origin = projectFormatSurfacePoint(1, 0, 0);
    expect(fullTurns.leftPercent).toBeCloseTo(origin.leftPercent);
    expect(fullTurns.topPercent).toBeCloseTo(origin.topPercent);
    expect(fullTurns.depth).toBeCloseTo(origin.depth);
  });

  it("keeps ordinary clicks below the globe drag threshold", () => {
    expect(shouldStartFormatGlobeDrag(2, 3)).toBe(false);
    expect(shouldStartFormatGlobeDrag(6, 0)).toBe(true);
    expect(shouldStartFormatGlobeDrag(5, 4)).toBe(true);
  });
});
