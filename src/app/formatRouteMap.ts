import type { FileImportFormat } from "./fileImport";
import type { OutputFormat } from "./exportDownload";

export type FormatRouteNode = {
  id: string;
  abbreviation: string;
  label: string;
  position: number;
  sourceMode?: FileImportFormat;
  outputFormat?: OutputFormat;
};

export type FormatRouteSelection = {
  sourceId: string | null;
  targetId: string | null;
};

export type FormatRouteMapControl = {
  controls: readonly HTMLButtonElement[];
  destroy(): void;
  element: HTMLElement;
  getSelection(): FormatRouteSelection;
  setSource(mode: FileImportFormat): void;
  setTarget(format: OutputFormat): void;
};

export type FormatRouteMapOptions = {
  initialSource?: FileImportFormat;
  initialTarget?: OutputFormat;
  onRouteSelected?: (
    sourceMode: FileImportFormat,
    outputFormat: OutputFormat,
  ) => void;
};

export const FORMAT_ROUTE_NODES: readonly FormatRouteNode[] = [
  { id: "png-sequence", abbreviation: "PNG", label: "PNG frames", position: 1, sourceMode: "png-sequence", outputFormat: "png-sequence" },
  { id: "spritesheet", abbreviation: "SHEET", label: "Sprite sheet", position: 2, sourceMode: "spritesheet-grid", outputFormat: "spritesheet" },
  { id: "atlas-json", abbreviation: "JSON", label: "Atlas JSON", position: 3, sourceMode: "spritesheet-json" },
  { id: "gif", abbreviation: "GIF", label: "GIF", position: 4, sourceMode: "gif" },
  { id: "apng", abbreviation: "APNG", label: "APNG", position: 5, sourceMode: "apng" },
  { id: "piskel", abbreviation: "PISKEL", label: "Piskel", position: 6, sourceMode: "piskel" },
  { id: "pixil", abbreviation: "PIXIL", label: "Pixilart", position: 7, sourceMode: "pixil" },
  { id: "openraster", abbreviation: "ORA", label: "OpenRaster", position: 8, sourceMode: "openraster" },
  { id: "pixelorama", abbreviation: "PXO", label: "Pixelorama", position: 9, sourceMode: "pixelorama" },
  { id: "krita", abbreviation: "KRA", label: "Krita", position: 10, sourceMode: "krita" },
  { id: "psd", abbreviation: "PSD", label: "Photoshop", position: 11, sourceMode: "psd" },
  { id: "aseprite", abbreviation: "ASE", label: "Aseprite", position: 12, sourceMode: "aseprite", outputFormat: "aseprite" },
] as const;

function getNode(id: string | null): FormatRouteNode | undefined {
  return FORMAT_ROUTE_NODES.find((node) => node.id === id);
}

export function advanceFormatRouteSelection(
  selection: FormatRouteSelection,
  node: FormatRouteNode,
): FormatRouteSelection {
  if (selection.sourceId === null || selection.targetId !== null) {
    return node.sourceMode === undefined
      ? selection
      : { sourceId: node.id, targetId: null };
  }
  if (node.outputFormat !== undefined) {
    return { sourceId: selection.sourceId, targetId: node.id };
  }
  return node.sourceMode === undefined
    ? selection
    : { sourceId: node.id, targetId: null };
}

export function getFormatRoute(
  selection: FormatRouteSelection,
): { source: FormatRouteNode; target: FormatRouteNode } | null {
  const source = getNode(selection.sourceId);
  const target = getNode(selection.targetId);
  return source?.sourceMode !== undefined && target?.outputFormat !== undefined
    ? { source, target }
    : null;
}

export function mountFormatRouteMap(
  container: HTMLElement,
  options: FormatRouteMapOptions = {},
): FormatRouteMapControl {
  const document = container.ownerDocument;
  const element = document.createElement("section");
  const header = document.createElement("div");
  const eyebrow = document.createElement("p");
  const heading = document.createElement("h3");
  const introduction = document.createElement("p");
  const map = document.createElement("div");
  const globe = document.createElement("div");
  const routeLine = document.createElement("div");
  const hub = document.createElement("div");
  const hubKicker = document.createElement("span");
  const hubText = document.createElement("strong");
  const nodeButtons = new Map<string, HTMLButtonElement>();
  const readout = document.createElement("div");
  const from = document.createElement("div");
  const fromLabel = document.createElement("span");
  const fromValue = document.createElement("strong");
  const arrow = document.createElement("span");
  const to = document.createElement("div");
  const toLabel = document.createElement("span");
  const toValue = document.createElement("strong");
  const status = document.createElement("p");
  const resetButton = document.createElement("button");

  element.className = "format-route-panel";
  element.setAttribute("aria-labelledby", "format-route-heading");
  header.className = "format-route-header";
  eyebrow.className = "format-route-eyebrow";
  eyebrow.textContent = "Step 1 · Draw a conversion route";
  heading.id = "format-route-heading";
  heading.textContent = "Choose two file formats on the map";
  introduction.textContent =
    "Click a source format, then click Aseprite, PNG frames, or Sprite sheet as the destination. The arrow shows the direction of conversion.";
  header.append(eyebrow, heading, introduction);

  map.className = "format-route-map";
  globe.className = "format-route-globe";
  globe.setAttribute("aria-hidden", "true");
  routeLine.className = "format-route-line";
  routeLine.setAttribute("aria-hidden", "true");
  hub.className = "format-route-hub";
  hubKicker.textContent = "FORMAT ROUTE";
  hubText.textContent = "Choose source";
  hub.append(hubKicker, hubText);
  map.append(globe, routeLine, hub);

  for (const node of FORMAT_ROUTE_NODES) {
    const button = document.createElement("button");
    const icon = document.createElement("span");
    const abbreviation = document.createElement("span");
    const label = document.createElement("span");
    button.type = "button";
    button.className = `format-route-node format-route-node-${node.position}`;
    button.setAttribute("data-route-node", node.id);
    button.setAttribute("aria-label", `${node.label} file format`);
    icon.className = "format-file-icon";
    icon.setAttribute("aria-hidden", "true");
    abbreviation.textContent = node.abbreviation;
    label.className = "format-route-node-label";
    label.textContent = node.label;
    icon.append(abbreviation);
    button.append(icon, label);
    nodeButtons.set(node.id, button);
    map.append(button);
  }

  readout.className = "format-route-readout";
  from.className = "format-route-endpoint";
  fromLabel.textContent = "FROM";
  fromValue.textContent = "Choose a source";
  from.append(fromLabel, fromValue);
  arrow.className = "format-route-readout-arrow";
  arrow.textContent = "→";
  arrow.setAttribute("aria-hidden", "true");
  to.className = "format-route-endpoint";
  toLabel.textContent = "TO";
  toValue.textContent = "Choose an output";
  to.append(toLabel, toValue);
  status.className = "format-route-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  resetButton.type = "button";
  resetButton.className = "format-route-reset";
  resetButton.textContent = "Clear route";
  readout.append(from, arrow, to, status, resetButton);
  element.append(header, map, readout);
  container.append(element);

  const initialSource = FORMAT_ROUTE_NODES.find(
    (node) => node.sourceMode === (options.initialSource ?? "png-sequence"),
  );
  const initialTarget = FORMAT_ROUTE_NODES.find(
    (node) => node.outputFormat === (options.initialTarget ?? "aseprite"),
  );
  let selection: FormatRouteSelection = {
    sourceId: initialSource?.id ?? null,
    targetId: initialTarget?.id ?? null,
  };

  const updateRouteLine = (): void => {
    const sourceButton = selection.sourceId === null
      ? undefined
      : nodeButtons.get(selection.sourceId);
    const targetButton = selection.targetId === null
      ? undefined
      : nodeButtons.get(selection.targetId);
    if (
      sourceButton === undefined ||
      targetButton === undefined ||
      typeof map.getBoundingClientRect !== "function" ||
      typeof sourceButton.getBoundingClientRect !== "function"
    ) {
      routeLine.hidden = true;
      return;
    }
    const mapRect = map.getBoundingClientRect();
    const sourceRect = sourceButton.getBoundingClientRect();
    const targetRect = targetButton.getBoundingClientRect();
    const sourceX = sourceRect.left + sourceRect.width / 2 - mapRect.left;
    const sourceY = sourceRect.top + sourceRect.height / 2 - mapRect.top;
    const targetX = targetRect.left + targetRect.width / 2 - mapRect.left;
    const targetY = targetRect.top + targetRect.height / 2 - mapRect.top;
    const deltaX = targetX - sourceX;
    const deltaY = targetY - sourceY;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance === 0) {
      routeLine.hidden = true;
      return;
    }
    routeLine.style.left = `${sourceX}px`;
    routeLine.style.top = `${sourceY}px`;
    routeLine.style.width = `${distance}px`;
    routeLine.style.transform = `rotate(${Math.atan2(deltaY, deltaX)}rad)`;
    routeLine.hidden = false;
  };

  const render = (): void => {
    const route = getFormatRoute(selection);
    const source = getNode(selection.sourceId);
    for (const node of FORMAT_ROUTE_NODES) {
      const button = nodeButtons.get(node.id)!;
      const isSource = selection.sourceId === node.id;
      const isTarget = selection.targetId === node.id;
      const awaitingTarget = selection.sourceId !== null && selection.targetId === null;
      button.className = [
        "format-route-node",
        `format-route-node-${node.position}`,
        isSource ? "is-source" : "",
        isTarget ? "is-target" : "",
        awaitingTarget && node.outputFormat !== undefined ? "is-target-ready" : "",
        awaitingTarget && node.outputFormat === undefined && !isSource ? "is-muted" : "",
      ].filter(Boolean).join(" ");
      button.setAttribute("aria-pressed", String(isSource || isTarget));
    }
    fromValue.textContent = source?.label ?? "Choose a source";
    toValue.textContent = route?.target.label ?? "Choose an output";
    if (selection.sourceId === null) {
      hubText.textContent = "Choose source";
      status.textContent = "Select the format you are starting with.";
    } else if (selection.targetId === null) {
      hubText.textContent = "Choose output";
      status.textContent = "Now choose Aseprite, PNG frames, or Sprite sheet as the destination.";
    } else {
      hubText.textContent = "Route ready";
      status.textContent = `${route!.source.label} to ${route!.target.label} is selected. Add your source files below.`;
    }
    updateRouteLine();
  };

  const nodeListeners = new Map<HTMLButtonElement, () => void>();
  for (const node of FORMAT_ROUTE_NODES) {
    const button = nodeButtons.get(node.id)!;
    const listener = (): void => {
      const next = advanceFormatRouteSelection(selection, node);
      if (next.sourceId === selection.sourceId && next.targetId === selection.targetId) return;
      selection = next;
      render();
      const route = getFormatRoute(selection);
      if (route !== null) {
        options.onRouteSelected?.(route.source.sourceMode!, route.target.outputFormat!);
      }
    };
    nodeListeners.set(button, listener);
    button.addEventListener("click", listener);
  }
  const resetListener = (): void => {
    selection = { sourceId: null, targetId: null };
    render();
  };
  resetButton.addEventListener("click", resetListener);
  const resizeListener = (): void => { updateRouteLine(); };
  document.defaultView?.addEventListener("resize", resizeListener);
  render();

  return {
    controls: [...nodeButtons.values(), resetButton],
    destroy(): void {
      for (const [button, listener] of nodeListeners) {
        button.removeEventListener("click", listener);
      }
      resetButton.removeEventListener("click", resetListener);
      document.defaultView?.removeEventListener("resize", resizeListener);
    },
    element,
    getSelection(): FormatRouteSelection {
      return { ...selection };
    },
    setSource(mode: FileImportFormat): void {
      const source = FORMAT_ROUTE_NODES.find((node) => node.sourceMode === mode);
      if (source === undefined || selection.sourceId === source.id) return;
      selection = { ...selection, sourceId: source.id };
      render();
    },
    setTarget(format: OutputFormat): void {
      const target = FORMAT_ROUTE_NODES.find((node) => node.outputFormat === format);
      if (target === undefined || selection.targetId === target.id) return;
      selection = { ...selection, targetId: target.id };
      render();
    },
  };
}
