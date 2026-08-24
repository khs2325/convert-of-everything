import { describe, expect, it } from "vitest";

import {
  advanceFormatRouteSelection,
  FORMAT_ROUTE_NODES,
  getFormatRoute,
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
});
