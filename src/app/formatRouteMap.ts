import type { FileImportFormat } from "./fileImport";
import type { OutputFormat } from "./exportDownload";

export type FormatRouteNode = {
  id: string;
  abbreviation: string;
  iconSrc?: string;
  label: string;
  position: number;
  sourceMode?: FileImportFormat;
  outputFormat?: OutputFormat;
};

export type FormatRouteSelection = {
  sourceId: string | null;
  targetId: string | null;
};

export type FormatSurfacePoint = {
  depth: number;
  isBack: boolean;
  leftPercent: number;
  scale: number;
  topPercent: number;
};

export type FormatSurfacePresentation = {
  opacity: number;
  zIndex: number;
};

export type FormatGlobeRotation = {
  rotationXDegrees: number;
  rotationYDegrees: number;
};

export type FormatRouteLineGeometry = {
  angleRadians: number;
  leftPx: number;
  topPx: number;
  widthPx: number;
};

type FormatRouteInteractiveControl =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement;

export type FormatRouteMapControl = {
  controls: readonly FormatRouteInteractiveControl[];
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
  { id: "png-sequence", abbreviation: "PNG", iconSrc: "/format-icons/png.png", label: "PNG frames", position: 1, sourceMode: "png-sequence", outputFormat: "png-sequence" },
  { id: "spritesheet", abbreviation: "SHEET", label: "Sprite sheet", position: 2, sourceMode: "spritesheet-grid", outputFormat: "spritesheet" },
  { id: "atlas-json", abbreviation: "JSON", iconSrc: "/format-icons/json.gif", label: "Atlas JSON", position: 3, sourceMode: "spritesheet-json" },
  { id: "gif", abbreviation: "GIF", label: "GIF", position: 4, sourceMode: "gif" },
  { id: "apng", abbreviation: "APNG", label: "APNG", position: 5, sourceMode: "apng" },
  { id: "piskel", abbreviation: "PISKEL", iconSrc: "/format-icons/piskel.png", label: "Piskel", position: 6, sourceMode: "piskel" },
  { id: "pixil", abbreviation: "PIXIL", iconSrc: "/format-icons/pixilart.ico", label: "Pixilart", position: 7, sourceMode: "pixil" },
  { id: "openraster", abbreviation: "ORA", label: "OpenRaster", position: 8, sourceMode: "openraster" },
  { id: "pixelorama", abbreviation: "PXO", iconSrc: "/format-icons/pixelorama.png", label: "Pixelorama", position: 9, sourceMode: "pixelorama" },
  { id: "krita", abbreviation: "KRA", iconSrc: "/format-icons/krita.ico", label: "Krita", position: 10, sourceMode: "krita" },
  { id: "psd", abbreviation: "PSD", label: "Photoshop", position: 11, sourceMode: "psd" },
  { id: "aseprite", abbreviation: "ASE", iconSrc: "/format-icons/aseprite.png", label: "Aseprite", position: 12, sourceMode: "aseprite", outputFormat: "aseprite" },
] as const;

const FORMAT_LATITUDES = [18, -24, 4, 32, -8, 20, -34, 2, 35, -18, -36, 0] as const;
const FORMAT_GLOBE_DRAG_THRESHOLD = 6;

function getNode(id: string | null): FormatRouteNode | undefined {
  return FORMAT_ROUTE_NODES.find((node) => node.id === id);
}

function hasClass(element: HTMLElement, token: string): boolean {
  return element.className.split(/\s+/).includes(token);
}

function toggleClass(element: HTMLElement, token: string, force: boolean): void {
  const classes = new Set(element.className.split(/\s+/).filter(Boolean));
  if (force) classes.add(token);
  else classes.delete(token);
  element.className = [...classes].join(" ");
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function shouldStartFormatGlobeDrag(
  deltaX: number,
  deltaY: number,
): boolean {
  return Math.hypot(deltaX, deltaY) >= FORMAT_GLOBE_DRAG_THRESHOLD;
}

export function projectFormatSurfacePoint(
  position: number,
  rotationXDegrees: number,
  rotationYDegrees: number,
): FormatSurfacePoint {
  const nodeIndex = Math.max(0, Math.min(FORMAT_ROUTE_NODES.length - 1, position - 1));
  const latitude = toRadians(FORMAT_LATITUDES[nodeIndex]);
  const longitude = toRadians(nodeIndex * (360 / FORMAT_ROUTE_NODES.length));
  const rotationX = toRadians(rotationXDegrees);
  const rotationY = toRadians(rotationYDegrees);
  const cosineLatitude = Math.cos(latitude);
  const baseX = cosineLatitude * Math.sin(longitude);
  const baseY = Math.sin(latitude);
  const baseZ = cosineLatitude * Math.cos(longitude);
  const rotatedX = baseX * Math.cos(rotationY) + baseZ * Math.sin(rotationY);
  const yawedZ = -baseX * Math.sin(rotationY) + baseZ * Math.cos(rotationY);
  const rotatedY = baseY * Math.cos(rotationX) - yawedZ * Math.sin(rotationX);
  const depth = baseY * Math.sin(rotationX) + yawedZ * Math.cos(rotationX);
  const normalizedDepth = (depth + 1) / 2;

  return {
    depth,
    isBack: depth < 0,
    leftPercent: 50 + rotatedX * 35,
    scale: 0.64 + normalizedDepth * 0.36,
    topPercent: 50 - rotatedY * 35,
  };
}

export function getFormatSurfacePresentation(
  point: FormatSurfacePoint,
  isSelected: boolean,
  isMuted: boolean,
): FormatSurfacePresentation {
  const surfaceOpacity = point.isBack
    ? isMuted ? 0.42 : 0.72
    : 0.78 + (point.depth + 1) * 0.11;
  return {
    opacity: isSelected ? 1 : isMuted ? surfaceOpacity * 0.38 : surfaceOpacity,
    zIndex: isSelected
      ? 22
      : point.isBack
        ? 2 + Math.round((point.depth + 1) * 3)
        : 10 + Math.round(point.depth * 8),
  };
}

export function offsetFormatGlobeRotation(
  rotationXDegrees: number,
  rotationYDegrees: number,
  deltaXDegrees: number,
  deltaYDegrees: number,
): FormatGlobeRotation {
  return {
    rotationXDegrees: rotationXDegrees + deltaXDegrees,
    rotationYDegrees: rotationYDegrees + deltaYDegrees,
  };
}

export function getFormatRouteLineGeometry(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): FormatRouteLineGeometry | null {
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  const distance = Math.hypot(deltaX, deltaY);
  return distance === 0
    ? null
    : {
        angleRadians: Math.atan2(deltaY, deltaX),
        leftPx: sourceX,
        topPx: sourceY,
        widthPx: distance,
      };
}

export function advanceFormatRouteSelection(
  selection: FormatRouteSelection,
  node: FormatRouteNode,
): FormatRouteSelection {
  if (selection.sourceId === node.id) {
    return { sourceId: null, targetId: null };
  }
  if (selection.targetId === node.id) {
    return { sourceId: selection.sourceId, targetId: null };
  }
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

function addSelectOption(
  document: Document,
  select: HTMLSelectElement,
  value: string,
  label: string,
): void {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
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
  const tools = document.createElement("div");
  const searchField = document.createElement("label");
  const searchLabel = document.createElement("span");
  const searchInput = document.createElement("input");
  const searchResults = document.createElement("div");
  const sourceField = document.createElement("label");
  const sourceLabel = document.createElement("span");
  const sourceSelect = document.createElement("select");
  const targetField = document.createElement("label");
  const targetLabel = document.createElement("span");
  const targetSelect = document.createElement("select");
  const map = document.createElement("div");
  const globe = document.createElement("div");
  const globeGrid = document.createElement("div");
  const globeShade = document.createElement("div");
  const routeLine = document.createElement("div");
  const routeLineDirection = document.createElement("span");
  const nodeButtons = new Map<string, HTMLButtonElement>();
  const searchButtons = new Map<string, HTMLButtonElement>();
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
  heading.textContent = "Rotate the globe and connect two formats";
  introduction.textContent =
    "Drag the globe to bring file formats on its surface into view. Choose a source, then a supported output. Back-side formats stay visible as compact abbreviations.";
  header.append(eyebrow, heading, introduction);

  tools.className = "format-route-tools";
  searchField.className = "format-route-tool format-route-search";
  searchLabel.textContent = "Find a format";
  searchInput.type = "search";
  searchInput.placeholder = "Search PNG, GIF, PSD…";
  searchInput.autocomplete = "off";
  searchInput.setAttribute("aria-controls", "format-route-search-results");
  searchResults.id = "format-route-search-results";
  searchResults.className = "format-route-search-results";
  searchResults.setAttribute("aria-label", "Matching file formats");
  searchResults.hidden = true;
  searchField.append(searchLabel, searchInput, searchResults);

  sourceField.className = "format-route-tool";
  sourceLabel.textContent = "Source";
  sourceSelect.setAttribute("aria-label", "Source format");
  addSelectOption(document, sourceSelect, "", "Choose source");
  targetField.className = "format-route-tool";
  targetLabel.textContent = "Output";
  targetSelect.setAttribute("aria-label", "Output format");
  addSelectOption(document, targetSelect, "", "Choose output");
  for (const node of FORMAT_ROUTE_NODES) {
    if (node.sourceMode !== undefined) {
      addSelectOption(document, sourceSelect, node.id, node.label);
    }
    if (node.outputFormat !== undefined) {
      addSelectOption(document, targetSelect, node.id, node.label);
    }
  }
  sourceField.append(sourceLabel, sourceSelect);
  targetField.append(targetLabel, targetSelect);
  tools.append(searchField, sourceField, targetField);

  map.className = "format-route-map";
  map.tabIndex = 0;
  map.setAttribute("role", "group");
  map.setAttribute(
    "aria-label",
    "Rotatable file format globe. Drag, or use the arrow keys while the globe is focused.",
  );
  globe.className = "format-route-globe";
  globe.setAttribute("aria-hidden", "true");
  globeGrid.className = "format-route-globe-grid";
  globe.append(globeGrid);
  globeShade.className = "format-route-globe-shade";
  globeShade.setAttribute("aria-hidden", "true");
  routeLine.className = "format-route-line";
  routeLine.setAttribute("aria-hidden", "true");
  routeLineDirection.className = "format-route-line-direction";
  routeLine.append(routeLineDirection);
  map.append(globe, globeShade, routeLine);

  for (const node of FORMAT_ROUTE_NODES) {
    const button = document.createElement("button");
    const icon = document.createElement("span");
    const abbreviation = document.createElement("span");
    const label = document.createElement("span");
    button.type = "button";
    button.className = "format-route-node";
    button.setAttribute("data-route-node", node.id);
    button.setAttribute("aria-label", `${node.label} file format`);
    icon.className = "format-file-icon";
    icon.setAttribute("aria-hidden", "true");
    if (node.iconSrc !== undefined) {
      const image = document.createElement("img");
      image.className = "format-file-logo";
      image.src = node.iconSrc;
      image.alt = "";
      icon.className += " has-official-logo";
      icon.append(image);
    } else {
      abbreviation.textContent = node.abbreviation;
      icon.append(abbreviation);
    }
    label.className = "format-route-node-label";
    label.textContent = node.label;
    button.append(icon, label);
    nodeButtons.set(node.id, button);
    map.append(button);

    const searchButton = document.createElement("button");
    searchButton.type = "button";
    searchButton.className = "format-route-search-result";
    searchButton.textContent = `${node.label} · ${node.abbreviation}`;
    searchButton.hidden = true;
    searchButtons.set(node.id, searchButton);
    searchResults.append(searchButton);
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
  element.append(header, tools, map, readout);
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
  let rotationX = 0;
  let rotationY = 0;
  let activePointerId: number | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartRotationX = 0;
  let dragStartRotationY = 0;
  let isDragging = false;
  let dragMoved = false;
  let suppressClick = false;

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
    const geometry = getFormatRouteLineGeometry(sourceX, sourceY, targetX, targetY);
    if (geometry === null) {
      routeLine.hidden = true;
      return;
    }
    routeLine.style.left = `${geometry.leftPx}px`;
    routeLine.style.top = `${geometry.topPx}px`;
    routeLine.style.width = `${geometry.widthPx}px`;
    routeLine.style.transform = `rotate(${geometry.angleRadians}rad)`;
    routeLine.hidden = false;
  };

  const renderSurface = (): void => {
    for (const node of FORMAT_ROUTE_NODES) {
      const button = nodeButtons.get(node.id)!;
      const point = projectFormatSurfacePoint(node.position, rotationX, rotationY);
      const isSelected = (
        hasClass(button, "is-source") || hasClass(button, "is-target")
      );
      const presentation = getFormatSurfacePresentation(
        point,
        isSelected,
        hasClass(button, "is-muted"),
      );
      button.style.left = `${point.leftPercent}%`;
      button.style.top = `${point.topPercent}%`;
      button.style.zIndex = String(presentation.zIndex);
      button.style.opacity = String(presentation.opacity);
      button.style.transform = `translate(-50%, -50%) scale(${point.scale})`;
      toggleClass(button, "is-back", point.isBack);
      button.setAttribute("data-surface-side", point.isBack ? "back" : "front");
    }
    globeGrid.style.transform = `rotate(${-rotationX * 0.18}deg) translateX(${rotationY % 36}px)`;
    updateRouteLine();
  };

  const render = (): void => {
    const route = getFormatRoute(selection);
    const source = getNode(selection.sourceId);
    for (const node of FORMAT_ROUTE_NODES) {
      const button = nodeButtons.get(node.id)!;
      const isSource = selection.sourceId === node.id;
      const isTarget = selection.targetId === node.id;
      const awaitingTarget = selection.sourceId !== null && selection.targetId === null;
      toggleClass(button, "is-source", isSource);
      toggleClass(button, "is-target", isTarget);
      toggleClass(
        button,
        "is-target-ready",
        awaitingTarget && node.outputFormat !== undefined,
      );
      toggleClass(
        button,
        "is-muted",
        awaitingTarget && node.outputFormat === undefined && !isSource,
      );
      button.setAttribute("aria-pressed", String(isSource || isTarget));
      searchButtons.get(node.id)!.setAttribute(
        "aria-pressed",
        String(isSource || isTarget),
      );
    }
    sourceSelect.value = selection.sourceId ?? "";
    targetSelect.value = selection.targetId ?? "";
    fromValue.textContent = source?.label ?? "Choose a source";
    toValue.textContent = route?.target.label ?? "Choose an output";
    if (selection.sourceId === null) {
      status.textContent = "Select the format you are starting with.";
    } else if (selection.targetId === null) {
      status.textContent = "Now choose Aseprite, PNG frames, or Sprite sheet as the destination.";
    } else {
      status.textContent = `${route!.source.label} to ${route!.target.label} is selected. Add files in the source panel.`;
    }
    renderSurface();
  };

  const applySelection = (
    next: FormatRouteSelection,
    notify = true,
  ): void => {
    if (
      next.sourceId === selection.sourceId &&
      next.targetId === selection.targetId
    ) return;
    selection = next;
    render();
    const route = getFormatRoute(selection);
    if (notify && route !== null) {
      options.onRouteSelected?.(route.source.sourceMode!, route.target.outputFormat!);
    }
  };

  const selectNode = (node: FormatRouteNode): void => {
    applySelection(advanceFormatRouteSelection(selection, node));
  };

  const nodeListeners = new Map<HTMLButtonElement, () => void>();
  for (const node of FORMAT_ROUTE_NODES) {
    const button = nodeButtons.get(node.id)!;
    const listener = (): void => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      selectNode(node);
    };
    nodeListeners.set(button, listener);
    button.addEventListener("click", listener);

    const searchButton = searchButtons.get(node.id)!;
    const searchResultListener = (): void => {
      selectNode(node);
      searchInput.value = "";
      searchResults.hidden = true;
    };
    nodeListeners.set(searchButton, searchResultListener);
    searchButton.addEventListener("click", searchResultListener);
  }

  const searchListener = (): void => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    let matches = 0;
    for (const node of FORMAT_ROUTE_NODES) {
      const button = searchButtons.get(node.id)!;
      const searchable = `${node.label} ${node.abbreviation} ${node.id}`.toLocaleLowerCase();
      button.hidden = query.length === 0 || !searchable.includes(query);
      if (!button.hidden) matches += 1;
    }
    searchResults.hidden = query.length === 0;
    searchResults.setAttribute("data-result-count", String(matches));
  };
  searchInput.addEventListener("input", searchListener);

  const sourceSelectListener = (): void => {
    const source = getNode(sourceSelect.value);
    applySelection(
      source?.sourceMode === undefined
        ? { sourceId: null, targetId: null }
        : { sourceId: source.id, targetId: selection.targetId },
    );
  };
  sourceSelect.addEventListener("change", sourceSelectListener);

  const targetSelectListener = (): void => {
    const target = getNode(targetSelect.value);
    applySelection({
      sourceId: selection.sourceId,
      targetId: target?.outputFormat === undefined ? null : target.id,
    });
  };
  targetSelect.addEventListener("change", targetSelectListener);

  const resetListener = (): void => {
    applySelection({ sourceId: null, targetId: null }, false);
    searchInput.value = "";
    searchResults.hidden = true;
  };
  resetButton.addEventListener("click", resetListener);

  const pointerDownListener = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0) return;
    activePointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartRotationX = rotationX;
    dragStartRotationY = rotationY;
    dragMoved = false;
    isDragging = false;
  };
  const pointerMoveListener = (event: PointerEvent): void => {
    if (activePointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    if (!isDragging && shouldStartFormatGlobeDrag(deltaX, deltaY)) {
      isDragging = true;
      dragMoved = true;
      toggleClass(map, "is-dragging", true);
      map.setPointerCapture?.(event.pointerId);
    }
    if (!isDragging) return;
    const nextRotation = offsetFormatGlobeRotation(
      dragStartRotationX,
      dragStartRotationY,
      -deltaY * 0.4,
      deltaX * 0.48,
    );
    rotationX = nextRotation.rotationXDegrees;
    rotationY = nextRotation.rotationYDegrees;
    renderSurface();
    event.preventDefault();
  };
  const endPointerDrag = (event: PointerEvent): void => {
    if (activePointerId !== event.pointerId) return;
    suppressClick = isDragging && dragMoved;
    activePointerId = null;
    toggleClass(map, "is-dragging", false);
    if (isDragging) map.releasePointerCapture?.(event.pointerId);
    isDragging = false;
    if (suppressClick) {
      document.defaultView?.setTimeout(() => { suppressClick = false; }, 0);
    }
  };
  map.addEventListener("pointerdown", pointerDownListener);
  map.addEventListener("pointermove", pointerMoveListener);
  map.addEventListener("pointerup", endPointerDrag);
  map.addEventListener("pointercancel", endPointerDrag);
  const lostPointerCaptureListener = (event: PointerEvent): void => {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    isDragging = false;
    toggleClass(map, "is-dragging", false);
  };
  map.addEventListener("lostpointercapture", lostPointerCaptureListener);

  const keyboardListener = (event: KeyboardEvent): void => {
    if (event.target !== map) return;
    const step = event.shiftKey ? 24 : 12;
    let deltaRotationX = 0;
    let deltaRotationY = 0;
    if (event.key === "ArrowLeft") deltaRotationY = -step;
    else if (event.key === "ArrowRight") deltaRotationY = step;
    else if (event.key === "ArrowUp") deltaRotationX = step;
    else if (event.key === "ArrowDown") deltaRotationX = -step;
    else if (event.key === "Home") {
      rotationX = 0;
      rotationY = 0;
    } else return;
    if (event.key !== "Home") {
      const nextRotation = offsetFormatGlobeRotation(
        rotationX,
        rotationY,
        deltaRotationX,
        deltaRotationY,
      );
      rotationX = nextRotation.rotationXDegrees;
      rotationY = nextRotation.rotationYDegrees;
    }
    event.preventDefault();
    renderSurface();
  };
  map.addEventListener("keydown", keyboardListener);

  const resizeListener = (): void => { updateRouteLine(); };
  document.defaultView?.addEventListener("resize", resizeListener);
  render();

  return {
    controls: [
      ...nodeButtons.values(),
      ...searchButtons.values(),
      searchInput,
      sourceSelect,
      targetSelect,
      resetButton,
    ],
    destroy(): void {
      for (const [button, listener] of nodeListeners) {
        button.removeEventListener("click", listener);
      }
      searchInput.removeEventListener("input", searchListener);
      sourceSelect.removeEventListener("change", sourceSelectListener);
      targetSelect.removeEventListener("change", targetSelectListener);
      resetButton.removeEventListener("click", resetListener);
      map.removeEventListener("pointerdown", pointerDownListener);
      map.removeEventListener("pointermove", pointerMoveListener);
      map.removeEventListener("pointerup", endPointerDrag);
      map.removeEventListener("pointercancel", endPointerDrag);
      map.removeEventListener("lostpointercapture", lostPointerCaptureListener);
      map.removeEventListener("keydown", keyboardListener);
      document.defaultView?.removeEventListener("resize", resizeListener);
    },
    element,
    getSelection(): FormatRouteSelection {
      return { ...selection };
    },
    setSource(mode: FileImportFormat): void {
      const source = FORMAT_ROUTE_NODES.find((node) => node.sourceMode === mode);
      if (source === undefined) return;
      applySelection({ ...selection, sourceId: source.id }, false);
    },
    setTarget(format: OutputFormat): void {
      const target = FORMAT_ROUTE_NODES.find((node) => node.outputFormat === format);
      if (target === undefined) return;
      applySelection({ ...selection, targetId: target.id }, false);
    },
  };
}
