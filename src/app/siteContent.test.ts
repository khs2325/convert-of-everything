import { describe, expect, it } from "vitest";

import { mountConverterUi } from "./converterUi";
import {
  createHomepageGuide,
  createHomepageOverview,
  createModeDecisionHelper,
  createSiteNavigationLinks,
  INFORMATION_PAGE_LINKS,
  SUPPORTED_FORMATS,
} from "./siteContent";

type Listener = EventListenerOrEventListenerObject;

class ElementStub {
  readonly attributes = new Map<string, string>();
  readonly children: ElementStub[] = [];
  readonly listeners = new Map<string, Listener>();
  accept = "";
  alt = "";
  className = "";
  disabled = false;
  hidden = false;
  href = "";
  id = "";
  inert = false;
  max = "";
  min = "";
  multiple = false;
  rel = "";
  required = false;
  src = "";
  step = "";
  style = { backgroundSize: "" };
  target = "";
  textContent = "";
  type = "";
  value = "";
  parent: ElementStub | null = null;

  constructor(
    readonly tagName: string,
    readonly ownerDocument: DocumentStub,
  ) {}

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, listener);
  }

  append(...children: (ElementStub | string)[]): void {
    for (const child of children) {
      if (typeof child === "string") {
        this.textContent += child;
      } else {
        child.parent = this;
        this.children.push(child);
        if (
          this.tagName === "select" &&
          child.tagName === "option" &&
          this.value.length === 0
        ) {
          this.value = child.value;
        }
      }
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  removeEventListener(type: string, listener: Listener): void {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  replaceChildren(...children: ElementStub[]): void {
    for (const child of this.children) {
      child.parent = null;
    }
    for (const child of children) {
      child.parent = this;
    }
    this.children.splice(0, this.children.length, ...children);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

class DocumentStub {
  createElement(tagName: string): ElementStub {
    return new ElementStub(tagName, this);
  }
}

function createDocument(): Document {
  return new DocumentStub() as unknown as Document;
}

function getText(element: ElementStub): string {
  return [
    element.textContent,
    ...element.children.map((child) => getText(child)),
  ].join("");
}

function findAll(
  element: ElementStub,
  predicate: (element: ElementStub) => boolean,
): ElementStub[] {
  return [
    ...(predicate(element) ? [element] : []),
    ...element.children.flatMap((child) => findAll(child, predicate)),
  ];
}

function contains(parent: ElementStub, child: ElementStub): boolean {
  return parent === child ||
    parent.children.some((node) => contains(node, child));
}

function hasClass(element: ElementStub, className: string): boolean {
  return element.className.split(/\s+/).includes(className);
}

function findSectionByHeading(
  root: ElementStub,
  headingText: string,
): ElementStub {
  const heading = findAll(
    root,
    (element) =>
      /^h[1-6]$/.test(element.tagName) && getText(element) === headingText,
  )[0];
  let current = heading?.parent ?? null;
  while (current !== null && current.tagName !== "section") {
    current = current.parent;
  }
  if (current === null) {
    throw new Error(`Could not find section headed "${headingText}".`);
  }
  return current;
}

const AD_MARKER_PATTERN =
  /(^|[\s_-])(ad|ads|adsense|adsbygoogle|adslot|ad-slot|ad-unit|ad-placement|ad-placeholder|ad-container|advertisement|advertising|sponsored)(?=$|[\s_-])/i;
const AD_URL_PATTERN =
  /(pagead|doubleclick|googlesyndication|googleadservices)/i;
const AD_LABEL_PATTERN = /\b(advertisement|advertising|sponsored)\b/i;
const PROHIBITED_REGION_CLASSES = new Set([
  "drop-zone",
  "download-area",
  "memory-warning",
  "selected-files",
  "selected-file-card",
  "selected-file-details",
  "selected-file-icon",
  "selected-file-list",
  "selected-file-thumbnail",
  "site-footer",
  "support-entry-link",
  "support-links",
  "support-provider-link",
  "support-provider-list",
  "support-section",
]);
const PROHIBITED_REGION_MARKER_PATTERN =
  /(^|[\s_-])(file-picker|private-file|selected-file|source-file|source-files|drop-zone|download-area|convert-action|conversion-action|support-provider|support-links|support-section)(?=$|[\s_-])/i;

function hasAdMarker(value: string): boolean {
  return AD_MARKER_PATTERN.test(value);
}

function isAdElement(element: ElementStub): boolean {
  const classValue = [
    element.className,
    element.getAttribute("class") ?? "",
  ].join(" ");
  const idValue = [element.id, element.getAttribute("id") ?? ""].join(" ");
  const labelValue = [
    element.getAttribute("aria-label") ?? "",
    element.getAttribute("title") ?? "",
  ].join(" ");

  return (
    hasAdMarker(classValue) ||
    hasAdMarker(idValue) ||
    AD_LABEL_PATTERN.test(labelValue) ||
    AD_URL_PATTERN.test(element.src) ||
    [...element.attributes.keys()].some((name) => /^data-ad($|-)/i.test(name))
  );
}

function isProhibitedAdRegion(element: ElementStub): boolean {
  const classes = element.className.split(/\s+/).filter(Boolean);
  const classValue = classes.join(" ");
  const labelValue = element.getAttribute("aria-label") ?? "";

  return (
    classes.some((className) => PROHIBITED_REGION_CLASSES.has(className)) ||
    PROHIBITED_REGION_MARKER_PATTERN.test(classValue) ||
    element.id === "support" ||
    element.getAttribute("role") === "alert" ||
    (element.tagName === "input" && element.type === "file") ||
    (element.tagName === "button" &&
      ["Clear selected files", "Convert to .aseprite", "Download .aseprite"]
        .includes(getText(element))) ||
    labelValue === "Aseprite export"
  );
}

function getProhibitedAdRegions(root: ElementStub): ElementStub[] {
  const regions = [
    ...findAll(root, isProhibitedAdRegion),
    findSectionByHeading(root, "2. Add source files"),
    findSectionByHeading(root, "3. Convert and download"),
  ];
  return [...new Set(regions)];
}

function getUnsafeAdPlacements(root: ElementStub): ElementStub[] {
  const prohibitedRegions = getProhibitedAdRegions(root);
  return findAll(root, isAdElement).filter((adElement) =>
    prohibitedRegions.some((region) => contains(region, adElement)),
  );
}

describe("AdSense readiness site content", () => {
  it("uses ordinary multi-page links for the primary site navigation", () => {
    expect(INFORMATION_PAGE_LINKS.map((page) => page.id)).toEqual([
      "converter",
      "guides",
      "compatibility-lab",
      "articles",
      "troubleshooting",
      "about",
    ]);

    const links = createSiteNavigationLinks(createDocument());
    expect(links.map((link) => link.href)).toEqual([
      "/",
      "/guides/",
      "/compatibility-lab/",
      "/articles/",
      "/troubleshooting/",
      "/about/",
    ]);
  });

  it("keeps concise useful context around the homepage converter", () => {
    const overview = createHomepageOverview(createDocument()) as unknown as ElementStub;
    const text = getText(overview);
    const hrefs = findAll(overview, (element) => element.tagName === "a").map(
      (element) => element.href,
    );

    expect(text).toContain("rebuilds timelines from flat frame sources");
    expect(text).toContain("preserves layers only when");
    expect(hrefs).toEqual(expect.arrayContaining([
      "/compatibility-lab/",
      "/guides/",
      "/articles/aseprite-frames-layers-cels/",
      "/troubleshooting/",
    ]));
  });

  it("provides substantial project-specific guidance on the interactive homepage", () => {
    const guide = createHomepageGuide(createDocument()) as unknown as ElementStub;
    const text = getText(guide);
    const hrefs = findAll(guide, (element) => element.tagName === "a").map(
      (element) => element.href,
    );

    expect(text).toContain("A practical guide to rebuilding sprite projects");
    expect(text).toContain("What happens inside the browser");
    expect(text).toContain("No blanket lossless claim is made");
    expect(text).toContain("recover original layers");
    expect(text.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/gu)?.length ?? 0)
      .toBeGreaterThan(650);
    expect(hrefs).toEqual(expect.arrayContaining([
      "/guides/",
      "/articles/browser-local-conversion/",
      "/troubleshooting/",
    ]));
  });

  it("renders a mode decision helper derived from implemented formats", () => {
    const helper = createModeDecisionHelper(createDocument()) as unknown as ElementStub;
    const text = getText(helper);

    expect(text).toContain("I have multiple PNG frames");
    expect(text).toContain("I have one grid spritesheet");
    expect(text).toContain("I have a spritesheet with JSON");
    expect(text).toContain("I have a project file");
    expect(text).toContain("I have GIF or APNG animation");
    expect(text).toContain("Pixil/Pixilart");
    expect(text).not.toContain("Coming soon");
  });

  it("keeps supported-format labels aligned with implemented importers", () => {
    expect(SUPPORTED_FORMATS.map((format) => format.input)).toEqual([
      "PNG sequence",
      "Spritesheet grid",
      "Spritesheet PNG + JSON",
      "Piskel project",
      "Pixil/Pixilart project",
      "OpenRaster project",
      "Pixelorama project",
      "Krita project",
      "PSD project",
      "GIF animation",
      "APNG animation",
    ]);
    expect(SUPPORTED_FORMATS.map((format) => format.supportLevel))
      .not.toContain("Planned");
    expect(
      SUPPORTED_FORMATS.find((format) => format.input === "Pixil/Pixilart project")
        ?.supportLevel,
    ).toBe("Experimental");
    expect(
      SUPPORTED_FORMATS.find((format) => format.input === "PSD project")
        ?.limitations,
    ).toContain("smart objects");
  });

  it("does not render a future ad placeholder or fake ads", () => {
    const document = new DocumentStub();
    const root = document.createElement("main");
    mountConverterUi(root as unknown as HTMLElement);
    const text = getText(root).toLowerCase();

    expect(findAll(root, (element) =>
      element.className.split(/\s+/).includes("future-ad-placeholder"),
    )).toHaveLength(0);
    expect(text).not.toContain("future advertising space");
    expect(text).not.toContain("fake ad");
    expect(text).not.toContain("adsbygoogle");
    expect(text).not.toContain("pagead2.googlesyndication.com");
    expect(text).not.toContain("click the ad");
    expect(text).not.toContain("support us by clicking");
    expect(text).not.toContain("ad placeholder");
    expect(findAll(root, (element) => element.tagName === "script")).toHaveLength(0);
  });

  it("keeps ad elements out of sensitive converter and private-file UI", () => {
    const document = new DocumentStub();
    const root = document.createElement("main");
    mountConverterUi(root as unknown as HTMLElement);
    const prohibitedRegions = getProhibitedAdRegions(root);

    expect(prohibitedRegions.some((element) => hasClass(element, "drop-zone")))
      .toBe(true);
    expect(
      prohibitedRegions.some(
        (element) => element.tagName === "input" && element.type === "file",
      ),
    ).toBe(true);
    expect(
      prohibitedRegions.some((element) => getText(element) === "Convert to .aseprite"),
    ).toBe(true);
    expect(
      prohibitedRegions.some((element) => hasClass(element, "download-area")),
    ).toBe(true);
    expect(prohibitedRegions.some((element) => element.id === "support"))
      .toBe(true);
    expect(
      prohibitedRegions.some((element) => hasClass(element, "selected-files")),
    ).toBe(true);
    expect(
      prohibitedRegions.some((element) => element.getAttribute("role") === "alert"),
    ).toBe(true);
    expect(getUnsafeAdPlacements(root)).toEqual([]);
  });
});
