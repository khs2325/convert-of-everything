import { describe, expect, it } from "vitest";

import {
  advanceFormatRouteSelection,
  FORMAT_ROUTE_NODES,
  getFormatRoute,
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

  it("keeps ordinary clicks below the globe drag threshold", () => {
    expect(shouldStartFormatGlobeDrag(2, 3)).toBe(false);
    expect(shouldStartFormatGlobeDrag(6, 0)).toBe(true);
    expect(shouldStartFormatGlobeDrag(5, 4)).toBe(true);
  });
});
