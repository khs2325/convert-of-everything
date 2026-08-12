export type SitePageLink = {
  href: string;
  id: string;
  label: string;
};

type FormatSupport = {
  animation: string;
  duration: string;
  guide: {
    commonMistakes: readonly string[];
    expectedOutput: string;
    preparation: readonly string[];
    troubleshooting: string;
    whenToUse: string;
  };
  input: string;
  layerPreservation: string;
  limitations: string;
  requiredFiles: string;
  supportLevel: "Supported" | "Limited support" | "Experimental";
};

export const INFORMATION_PAGE_LINKS: readonly SitePageLink[] = [
  { href: "/", id: "converter", label: "Converter" },
  { href: "/guides/", id: "guides", label: "Guides" },
  { href: "/articles/", id: "articles", label: "Articles" },
  { href: "/troubleshooting/", id: "troubleshooting", label: "Troubleshooting" },
  { href: "/about/", id: "about", label: "About" },
];

export const SUPPORTED_FORMATS: readonly FormatSupport[] = [
  {
    input: "PNG sequence",
    requiredFiles: "One or more `.png` files with the same canvas size.",
    animation: "Yes, each PNG becomes one frame.",
    layerPreservation:
      "No original source layers; PNG files are flat images.",
    duration:
      "Uses the converter's default frame timing unless edited after import.",
    limitations:
      "Every frame must be a valid PNG with matching dimensions.",
    supportLevel: "Supported",
    guide: {
      whenToUse:
        "Use this when an animation is exported as numbered frame images.",
      preparation: [
        "Name frames so their file order is easy to verify before selection.",
        "Keep every frame the same width and height.",
        "Crop or resize outside the converter if the frames do not match.",
      ],
      expectedOutput:
        "A single-layer Aseprite timeline with one frame per PNG.",
      commonMistakes: [
        "Mixing PNG frames with different canvas sizes.",
        "Expecting flat PNGs to recreate original source layers.",
      ],
      troubleshooting:
        "If import fails, remove non-PNG files and check the dimensions of each frame.",
    },
  },
  {
    input: "Spritesheet grid",
    requiredFiles: "Exactly one `.png` spritesheet plus grid settings.",
    animation: "Yes, grid cells become ordered frames.",
    layerPreservation:
      "No original source layers; the spritesheet is a flat image.",
    duration:
      "Uses the converter's default frame timing unless edited after import.",
    limitations:
      "The grid must fit the image exactly; leftover edge pixels are not converted.",
    supportLevel: "Supported",
    guide: {
      whenToUse:
        "Use this when frames are arranged in evenly sized rows and columns.",
      preparation: [
        "Select one PNG spritesheet.",
        "Enter frame size or rows and columns; the UI snaps to exact image divisors.",
        "Check the grid overlay before converting.",
      ],
      expectedOutput:
        "A single-layer Aseprite timeline sliced from the grid order you choose.",
      commonMistakes: [
        "Using a sheet with padding or uneven spacing that is not part of the grid.",
        "Entering a frame size that does not divide the image evenly.",
      ],
      troubleshooting:
        "If conversion is disabled, review the image size, grid summary, and exact-fit status near the preview.",
    },
  },
  {
    input: "Spritesheet PNG + JSON",
    requiredFiles: "One `.png` spritesheet and one supported `.json` atlas file.",
    animation: "Yes, JSON frame entries become timeline frames.",
    layerPreservation:
      "No original source layers; atlas metadata describes frame rectangles, not editor layers.",
    duration:
      "Preserves supported duration metadata when the JSON provides it.",
    limitations:
      "Unsupported atlas variants, out-of-bounds rectangles, and incomplete trim metadata are rejected.",
    supportLevel: "Supported",
    guide: {
      whenToUse:
        "Use this when an exporter produced a spritesheet plus frame metadata.",
      preparation: [
        "Select the PNG and its matching JSON file together.",
        "Keep the JSON in the documented supported root-level frame layout.",
        "Do not hand-edit atlas coordinates unless you can validate them.",
      ],
      expectedOutput:
        "A single-layer Aseprite timeline with frame order and supported timing from the JSON.",
      commonMistakes: [
        "Selecting a JSON file that belongs to a different spritesheet.",
        "Using nested multi-atlas metadata that the importer does not support.",
      ],
      troubleshooting:
        "If the JSON is rejected, check that every rectangle fits inside the image and that trim/rotation metadata is complete.",
    },
  },
  {
    input: "Piskel project",
    requiredFiles: "Exactly one `.piskel` file from the supported model-version-2 subset.",
    animation: "Yes, visible frames become timeline frames.",
    layerPreservation:
      "Preserves supported Piskel layers when the project contains layer data.",
    duration:
      "Maps supported Piskel timing to Aseprite frame durations.",
    limitations:
      "Malformed layer JSON, unsupported model versions, invalid hidden-frame data, and bad embedded PNGs are rejected.",
    supportLevel: "Limited support",
    guide: {
      whenToUse:
        "Use this when you have the original Piskel project file rather than a flattened export.",
      preparation: [
        "Save or export a `.piskel` file from Piskel.",
        "Keep source layers visible if you want them included in the output.",
        "Use a small test project first when validating a workflow.",
      ],
      expectedOutput:
        "An Aseprite timeline with supported visible frames and supported source layers.",
      commonMistakes: [
        "Trying to import a flattened PNG instead of the project file.",
        "Expecting hidden-frame state itself to be preserved.",
      ],
      troubleshooting:
        "If validation fails, reopen the file in Piskel and save a fresh copy before trying again.",
    },
  },
  {
    input: "Pixil/Pixilart project",
    requiredFiles: "Exactly one `.pixil` file from the documented project-file subset.",
    animation: "Yes, supported frames become timeline frames.",
    layerPreservation:
      "Preserves supported Pixil layers when verified layer data is present.",
    duration:
      "Preserves supported per-frame duration fields when present.",
    limitations:
      "The parser accepts only fixture-backed project structures and rejects unverified variants.",
    supportLevel: "Experimental",
    guide: {
      whenToUse:
        "Use this for local Pixil/Pixilart project files that match the documented subset.",
      preparation: [
        "Use the `.pixil` project file, not a gallery page or flattened export.",
        "Start with a small file when testing compatibility.",
        "Keep unsupported editor features out of the file when possible.",
      ],
      expectedOutput:
        "Aseprite frames and layers from the supported Pixil project structure.",
      commonMistakes: [
        "Selecting an exported PNG, GIF, or web page instead of a `.pixil` project file.",
        "Expecting unverified Pixil editor features to import silently.",
      ],
      troubleshooting:
        "If the file is rejected, compare it with the documented subset and create a small reproduction file without private artwork.",
    },
  },
  {
    input: "OpenRaster project",
    requiredFiles: "Exactly one `.ora` file with supported normal PNG-backed raster layers.",
    animation: "Limited; imports the supported raster layer data the importer can map.",
    layerPreservation:
      "Preserves supported normal raster layers and layer metadata.",
    duration:
      "Only documented timing/frame data is preserved when the source subset supports it.",
    limitations:
      "Nested stacks, unsupported blend modes, and missing layer data are rejected.",
    supportLevel: "Limited support",
    guide: {
      whenToUse:
        "Use this when your editor can save OpenRaster with ordinary raster layers.",
      preparation: [
        "Flatten unsupported groups or special layer effects before saving.",
        "Keep layers as normal raster layers.",
        "Verify the output in Aseprite after conversion.",
      ],
      expectedOutput:
        "An editable Aseprite file with supported raster layers.",
      commonMistakes: [
        "Using nested stacks or non-normal blend modes.",
        "Assuming every OpenRaster-producing app uses the same subset.",
      ],
      troubleshooting:
        "If the importer rejects the file, simplify the layer stack and save a new `.ora` copy.",
    },
  },
  {
    input: "Pixelorama project",
    requiredFiles: "Exactly one `.pxo` file from the documented raster subset.",
    animation: "Yes, supported frames become timeline frames.",
    layerPreservation:
      "Preserves supported raster layers, names, visibility, and opacity.",
    duration:
      "Preserves documented frame timing from the supported `.pxo` subset.",
    limitations:
      "Tilemaps, effects, unsupported blend modes, and ambiguous metadata are rejected.",
    supportLevel: "Limited support",
    guide: {
      whenToUse:
        "Use this when the original Pixelorama project file is available.",
      preparation: [
        "Use supported raster pixel layers.",
        "Avoid tilemaps and effects for the first conversion pass.",
        "Keep a backup of the original project file.",
      ],
      expectedOutput:
        "An Aseprite timeline with supported frames and raster layers.",
      commonMistakes: [
        "Using tilemap layers or effects that are outside the supported subset.",
        "Assuming editor-only metadata will carry over.",
      ],
      troubleshooting:
        "If the file fails, remove unsupported layer types in Pixelorama and export a simpler `.pxo` file.",
    },
  },
  {
    input: "Krita project",
    requiredFiles: "Exactly one `.kra` file from the documented 8-bit RGBA paint-layer subset.",
    animation: "Limited to documented frame data when present.",
    layerPreservation:
      "Preserves supported paint layers from the documented subset.",
    duration:
      "Preserves supported frame timing only where the importer documents it.",
    limitations:
      "Vector layers, unsupported color depth, flattened-preview-only files, and missing layer data are rejected.",
    supportLevel: "Limited support",
    guide: {
      whenToUse:
        "Use this when a Krita file has ordinary raster paint layers in the supported subset.",
      preparation: [
        "Save as 8-bit RGBA with paint layers.",
        "Avoid vector layers and unsupported color-depth workflows.",
        "Check whether a smaller test copy imports before converting large artwork.",
      ],
      expectedOutput:
        "Aseprite layers and frames from supported Krita raster data.",
      commonMistakes: [
        "Expecting a flattened preview image to preserve layers.",
        "Including unsupported vector or color-depth data.",
      ],
      troubleshooting:
        "If the importer rejects the file, simplify the Krita document to supported paint layers.",
    },
  },
  {
    input: "PSD project",
    requiredFiles: "Exactly one `.psd` file from the RGB 8-bit raster-layer subset.",
    animation: "Initial support focuses on raster layers, not full Photoshop animation.",
    layerPreservation:
      "Preserves supported visible raster layer names and opacity where possible.",
    duration:
      "Uses standard output timing unless documented frame data exists in the supported subset.",
    limitations:
      "Text layers, smart objects, adjustment layers, effects, unsupported blend modes, unsupported color modes, and PSB are outside the supported subset.",
    supportLevel: "Experimental",
    guide: {
      whenToUse:
        "Use this for simple RGB 8-bit PSD files with raster layers.",
      preparation: [
        "Keep a copy of the original PSD.",
        "Rasterize text, smart objects, adjustment layers, and effects if they are needed visually.",
        "Avoid relying on Photoshop-only features in the converted output.",
      ],
      expectedOutput:
        "An editable Aseprite file from the supported raster-layer subset.",
      commonMistakes: [
        "Expecting full Photoshop compatibility.",
        "Expecting text layers, smart objects, or effects to stay editable.",
      ],
      troubleshooting:
        "If conversion fails, export a simpler RGB 8-bit PSD with normal raster layers.",
    },
  },
  {
    input: "GIF animation",
    requiredFiles: "Exactly one `.gif` file from the supported GIF subset.",
    animation: "Yes, decoded animation frames become timeline frames.",
    layerPreservation:
      "No source layers; GIF is treated as a flat animated image.",
    duration:
      "Preserves supported GIF frame delays after importer normalization.",
    limitations:
      "Unsupported disposal, timing, transparency, or malformed stream cases may be rejected.",
    supportLevel: "Limited support",
    guide: {
      whenToUse:
        "Use this when you have an animated GIF and need editable timing in Aseprite.",
      preparation: [
        "Use the original GIF file rather than screenshots.",
        "Expect a flat layer timeline.",
        "Check transparency and disposal behavior in the preview.",
      ],
      expectedOutput:
        "A flat Aseprite timeline with frames decoded from the GIF animation.",
      commonMistakes: [
        "Expecting GIF to contain original editor layers.",
        "Using a damaged or partially downloaded GIF.",
      ],
      troubleshooting:
        "If motion looks wrong, the source may use a disposal or transparency pattern outside the supported subset.",
    },
  },
  {
    input: "APNG animation",
    requiredFiles: "Exactly one `.apng` or APNG-compatible `.png` file.",
    animation: "Yes, APNG animation chunks become timeline frames.",
    layerPreservation:
      "No source layers; APNG is treated as a flat animated image.",
    duration:
      "Preserves supported APNG frame timing and compositing behavior.",
    limitations:
      "Static PNG files, unsupported blend/disposal patterns, and malformed chunks may be rejected.",
    supportLevel: "Limited support",
    guide: {
      whenToUse:
        "Use this when an animation is stored as APNG rather than a spritesheet.",
      preparation: [
        "Select the APNG file directly.",
        "Confirm the source is animated, not just a static PNG.",
        "Review timing after conversion.",
      ],
      expectedOutput:
        "A flat Aseprite timeline with frames decoded from APNG chunks.",
      commonMistakes: [
        "Selecting a static PNG in APNG mode.",
        "Expecting APNG to preserve original editor layers.",
      ],
      troubleshooting:
        "If the file is rejected as not animated, use PNG sequence or spritesheet mode instead.",
    },
  },
];

function createParagraph(document: Document, text: string): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

function createExternalLink(
  document: Document,
  href: string,
  text: string,
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = text;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function createSection(
  document: Document,
  id: string,
  headingText: string,
  children: readonly HTMLElement[],
): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  section.id = id;
  section.className = "panel site-info-section";
  section.setAttribute("aria-labelledby", `${id}-heading`);
  heading.id = `${id}-heading`;
  heading.textContent = headingText;
  section.append(heading, ...children);
  return section;
}

function createList(document: Document, items: readonly string[]): HTMLUListElement {
  const list = document.createElement("ul");
  for (const text of items) {
    const item = document.createElement("li");
    item.textContent = text;
    list.append(item);
  }
  return list;
}

function createDefinitionList(
  document: Document,
  entries: readonly [string, string][],
): HTMLDListElement {
  const list = document.createElement("dl");
  list.className = "definition-list";
  for (const [term, description] of entries) {
    const termElement = document.createElement("dt");
    const descriptionElement = document.createElement("dd");
    termElement.textContent = term;
    descriptionElement.textContent = description;
    list.append(termElement, descriptionElement);
  }
  return list;
}

function createCard(
  document: Document,
  headingText: string,
  children: readonly HTMLElement[],
): HTMLElement {
  const article = document.createElement("article");
  const heading = document.createElement("h3");
  article.className = "content-card";
  heading.textContent = headingText;
  article.append(heading, ...children);
  return article;
}

function createBadge(document: Document, label: string): HTMLElement {
  const badge = document.createElement("span");
  badge.className = `format-badge format-badge-${label.toLowerCase().replace(/\s+/gu, "-")}`;
  badge.textContent = label;
  return badge;
}

export function createSiteNavigationLinks(
  document: Document,
): HTMLAnchorElement[] {
  return INFORMATION_PAGE_LINKS.map((page) => {
    const link = document.createElement("a");
    link.href = page.href;
    link.textContent = page.label;
    return link;
  });
}

export function createModeDecisionHelper(document: Document): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  const intro = createParagraph(
    document,
    "Choose the mode that matches the file you actually have. The converter does not invent layer data that is absent from the source.",
  );
  const cards = document.createElement("div");
  section.id = "mode-helper";
  section.className = "panel mode-helper";
  section.setAttribute("aria-labelledby", "mode-helper-heading");
  heading.id = "mode-helper-heading";
  heading.textContent = "Choose the right conversion mode";
  cards.className = "card-grid";
  cards.append(
    createCard(document, "I have multiple PNG frames", [
      createParagraph(
        document,
        "Select PNG sequence. Required files: one or more matching PNG images. The result is a flat timeline; original layers cannot be recovered.",
      ),
    ]),
    createCard(document, "I have one grid spritesheet", [
      createParagraph(
        document,
        "Select Spritesheet grid. Required file: one PNG. Enter or snap rows, columns, and frame size until the preview covers the image exactly.",
      ),
    ]),
    createCard(document, "I have a spritesheet with JSON", [
      createParagraph(
        document,
        "Select Spritesheet PNG + JSON. Required files: one PNG and one supported JSON atlas. The JSON can preserve frame rectangles and supported timing, not source layers.",
      ),
    ]),
    createCard(document, "I have a project file", [
      createParagraph(
        document,
        "Select the matching project mode for Piskel, Pixil/Pixilart, OpenRaster, Pixelorama, Krita, or PSD. Supported layers are preserved only when the source file contains supported layer data.",
      ),
    ]),
    createCard(document, "I have GIF or APNG animation", [
      createParagraph(
        document,
        "Select GIF animation or APNG animation. These modes rebuild animated frames and timing from flat animated image formats; they do not recover editor layers.",
      ),
    ]),
  );
  section.append(heading, intro, cards);
  return section;
}

export function createHomepageOverview(document: Document): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  const introduction = createParagraph(
    document,
    "The converter rebuilds timelines from flat frame sources and preserves layers only when a supported project file actually contains supported raster layer data.",
  );
  const cards = document.createElement("div");
  const guidesCard = createCard(document, "Choose the right source", [
    createParagraph(
      document,
      "Compare PNG sequences, spritesheets, animated images, and project files before converting. The guide hub explains frame timing, layer limits, and expected output.",
    ),
  ]);
  const architectureCard = createCard(document, "Understand the output", [
    createParagraph(
      document,
      "Learn how canvas, frames, layers, and cels fit together in the canonical SpriteProject model and the generated Aseprite file.",
    ),
  ]);
  const troubleshootingCard = createCard(document, "Diagnose a failure", [
    createParagraph(
      document,
      "Find practical causes and fixes for unavailable conversion, mismatched dimensions, malformed metadata, unsupported features, and browser memory limits.",
    ),
  ]);
  const addLink = (
    card: HTMLElement,
    href: string,
    label: string,
  ): void => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    link.className = "guide-detail-link";
    card.append(link);
  };

  section.className = "panel homepage-overview";
  section.setAttribute("aria-labelledby", "homepage-overview-heading");
  heading.id = "homepage-overview-heading";
  heading.textContent = "Documentation built around the converter";
  cards.className = "card-grid";
  addLink(guidesCard, "/guides/", "Open the conversion guides");
  addLink(
    architectureCard,
    "/articles/aseprite-frames-layers-cels/",
    "Read about frames, layers, and cels",
  );
  addLink(
    troubleshootingCard,
    "/troubleshooting/",
    "Open troubleshooting",
  );
  cards.append(guidesCard, architectureCard, troubleshootingCard);
  section.append(heading, introduction, cards);
  return section;
}

function createHomepageQuestion(
  document: Document,
  question: string,
  answer: string,
): HTMLDetailsElement {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = question;
  details.append(summary, createParagraph(document, answer));
  return details;
}

export function createHomepageGuide(document: Document): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  const introduction = createParagraph(
    document,
    "A useful conversion starts with the structure that remains in the source file. This guide explains what the browser can rebuild, what each source can preserve, and how to verify the result instead of treating every image as equivalent.",
  );
  const sourceCards = document.createElement("div");
  const projectCard = createCard(document, "Start with an original project file", [
    createParagraph(
      document,
      "Piskel, Pixil/Pixilart, OpenRaster, Pixelorama, Krita, and PSD can contain real raster-layer records. The matching importer preserves supported layer data only when those records exist and fit the documented subset. Editor-only effects, unsupported blend modes, groups, vectors, or ambiguous metadata may be rejected rather than silently flattened.",
    ),
  ]);
  const sequenceCard = createCard(document, "Use PNG frames for a known sequence", [
    createParagraph(
      document,
      "A numbered PNG sequence is the most direct choice when every animation frame already exists as a separate image. Matching dimensions are required. The result rebuilds frame order on one flat layer because a PNG does not contain the boundaries, names, or opacity of the editor layers that originally produced it.",
    ),
  ]);
  const sheetCard = createCard(document, "Use grid or atlas data for a sheet", [
    createParagraph(
      document,
      "An evenly divided spritesheet can be sliced by exact rows, columns, frame size, and traversal order. A supported PNG plus JSON atlas can also carry frame rectangles, trim placement, and duration metadata. Both workflows convert frames from a flat image; neither recreates source layers that are absent from the sheet.",
    ),
  ]);
  const animationCard = createCard(document, "Use GIF or APNG for delivered animation", [
    createParagraph(
      document,
      "GIF and APNG importers decode the supported animation stream, including documented timing, transparency, disposal, and compositing behavior. They are useful when the animated image is the best source left, but their output is a flat reconstructed timeline rather than the original editor project.",
    ),
  ]);
  const guideLink = document.createElement("a");
  guideLink.href = "/guides/";
  guideLink.textContent = "Compare every supported source format";
  guideLink.className = "guide-detail-link";
  projectCard.append(guideLink);
  sourceCards.className = "card-grid homepage-source-grid";
  sourceCards.append(projectCard, sequenceCard, sheetCard, animationCard);

  const localHeading = document.createElement("h3");
  localHeading.textContent = "What happens inside the browser";
  const localExplanation = createParagraph(
    document,
    "After you choose files, browser APIs read their bytes in the current tab. The selected importer validates the format, decodes supported pixels and metadata, and constructs a SpriteProject with canvas size, frames, durations, layers, and positioned cels. The Aseprite writer then serializes that validated model into a downloadable Blob. The conversion path has no upload endpoint, cloud artwork store, or remote image-processing fallback.",
  );
  const privacyExplanation = document.createElement("p");
  const privacyLink = document.createElement("a");
  privacyLink.href = "/articles/browser-local-conversion/";
  privacyLink.textContent = "browser-local conversion architecture";
  privacyExplanation.append(
    "Ordinary page assets still come from the static host, and external links leave the site only when you follow them. Read the ",
    privacyLink,
    " for the exact boundary between local artwork processing and normal web requests.",
  );

  const workflowHeading = document.createElement("h3");
  workflowHeading.textContent = "A reliable prepare, convert, and verify workflow";
  const workflowIntro = createParagraph(
    document,
    "Keep the original file unchanged and test with a copy. A short verification pass catches most format mismatches before the converted file becomes part of a production art pipeline.",
  );
  const workflow = document.createElement("ol");
  workflow.className = "homepage-process";
  for (const itemText of [
    "Identify the richest source you still have. Prefer a supported project file for layers, atlas metadata for trimmed placement and timing, or separate PNG files for an unambiguous frame sequence.",
    "Choose the importer that matches the actual file instead of renaming an extension. Review the mode guidance for required companion files and unsupported features.",
    "Inspect filenames, canvas dimensions, grid fit, frame order, transparency, and timing before converting. Fix inconsistent source data in the original editor when possible.",
    "Convert once, download the generated .aseprite file, and open it in Aseprite. The browser download is the handoff point; the source is not replaced or edited.",
    "Compare canvas size, frame count, frame order, durations, transparency, cel positions, layer order, names, visibility, and opacity against the source capabilities.",
    "If validation fails, keep the exact safe error message and make the smallest synthetic reproduction you can. Troubleshooting is safer than deleting metadata until an invalid file happens to import.",
  ]) {
    const item = document.createElement("li");
    item.textContent = itemText;
    workflow.append(item);
  }
  const troubleshootingLink = document.createElement("a");
  troubleshootingLink.href = "/troubleshooting/";
  troubleshootingLink.textContent = "Open symptom-based troubleshooting";
  troubleshootingLink.className = "guide-detail-link";

  const faqHeading = document.createElement("h3");
  faqHeading.textContent = "Questions to answer before relying on the output";
  const faq = document.createElement("div");
  faq.className = "homepage-faq";
  faq.append(
    createHomepageQuestion(
      document,
      "Can a flat PNG, spritesheet, GIF, or APNG recover original layers?",
      "No. Those sources describe rendered pixels and sometimes frames or timing, but they do not contain the missing editor-layer boundaries. The converter can rebuild a timeline from them, not recover data that was flattened away.",
    ),
    createHomepageQuestion(
      document,
      "Why does a project importer reject some files from a named editor?",
      "Each importer supports a documented, tested subset rather than every version and editor feature. Rejecting unsupported or ambiguous structures avoids producing a file that looks successful while losing important content without warning.",
    ),
    createHomepageQuestion(
      document,
      "Is every conversion lossless?",
      "No blanket lossless claim is made. Supported pixels, timing, placement, and raster-layer properties are converted where the importer documents them, while editor-specific effects, metadata, color modes, or unsupported structures may not transfer.",
    ),
    createHomepageQuestion(
      document,
      "Which checks matter most after opening the Aseprite file?",
      "Start with canvas dimensions, frame count and order, frame durations, transparency, and cel placement. For project formats, also verify layer names, order, visibility, opacity, and any documented blend limitations before editing further.",
    ),
    createHomepageQuestion(
      document,
      "Does conversion upload the selected artwork?",
      "No. Parsing, image decoding, validation, preview generation, Aseprite serialization, and download occur in the browser tab. The project intentionally has no conversion server or remote fallback for files that exceed local limits.",
    ),
  );

  section.id = "homepage-guide";
  section.className = "panel homepage-guide";
  section.setAttribute("aria-labelledby", "homepage-guide-heading");
  heading.id = "homepage-guide-heading";
  heading.textContent = "A practical guide to rebuilding sprite projects";
  section.append(
    heading,
    introduction,
    sourceCards,
    localHeading,
    localExplanation,
    privacyExplanation,
    workflowHeading,
    workflowIntro,
    workflow,
    troubleshootingLink,
    faqHeading,
    faq,
  );
  return section;
}

function createFormatMatrix(document: Document): HTMLElement {
  const wrapper = document.createElement("div");
  const table = document.createElement("table");
  const caption = document.createElement("caption");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headerRow = document.createElement("tr");
  wrapper.className = "table-scroll";
  caption.textContent = "Implemented source formats and what each one can preserve";
  for (const headingText of [
    "Input",
    "Required files",
    "Animation",
    "Layers",
    "Frame duration",
    "Support",
    "Important limitations",
  ]) {
    const cell = document.createElement("th");
    cell.textContent = headingText;
    headerRow.append(cell);
  }
  thead.append(headerRow);
  for (const format of SUPPORTED_FORMATS) {
    const row = document.createElement("tr");
    const values = [
      format.input,
      format.requiredFiles,
      format.animation,
      format.layerPreservation,
      format.duration,
      format.supportLevel,
      format.limitations,
    ];
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 5) {
        cell.append(createBadge(document, value));
      } else {
        cell.textContent = value;
      }
      row.append(cell);
    });
    tbody.append(row);
  }
  table.append(caption, thead, tbody);
  wrapper.append(table);
  return wrapper;
}

function createFormatGuideCards(document: Document): HTMLElement {
  const cards = document.createElement("div");
  cards.className = "guide-grid";
  for (const format of SUPPORTED_FORMATS) {
    cards.append(
      createCard(document, format.input, [
        createDefinitionList(document, [
          ["When to use", format.guide.whenToUse],
          ["Required inputs", format.requiredFiles],
          ["Expected output", format.guide.expectedOutput],
          ["Preservation behavior", `${format.layerPreservation} ${format.duration}`],
          ["Troubleshooting", format.guide.troubleshooting],
        ]),
        createList(document, [
          ...format.guide.preparation.map((item) => `Prepare: ${item}`),
          ...format.guide.commonMistakes.map((item) => `Avoid: ${item}`),
        ]),
      ]),
    );
  }
  return cards;
}

export function createInformationalPages(document: Document): HTMLElement {
  const container = document.createElement("div");
  container.className = "site-info-pages";

  const howItWorks = createSection(document, "how-it-works", "How conversion works", [
    createParagraph(
      document,
      "The converter is a static browser app: there is no conversion backend waiting for your artwork.",
    ),
    createList(document, [
      "You select files with the browser file picker or drag-and-drop.",
      "The browser reads the selected files locally with browser APIs.",
      "The matching importer converts supported data into the internal SpriteProject model.",
      "Validation checks dimensions, frame references, layers, cels, and unsupported variants.",
      "The preview renders the rebuilt timeline in the page.",
      "The Aseprite exporter writes a `.aseprite` file from SpriteProject.",
      "Your browser downloads the generated file locally.",
    ]),
    createDefinitionList(document, [
      [
        "Flat image formats",
        "PNG sequences, spritesheets, GIF, and APNG can rebuild frames, but they do not contain original editor layers.",
      ],
      [
        "Animated image formats",
        "GIF and APNG provide frames and timing, but still represent flat composited images.",
      ],
      [
        "Structured project formats",
        "Piskel, Pixil/Pixilart, OpenRaster, Pixelorama, Krita, and PSD can preserve supported layers only when the source contains supported layer data.",
      ],
    ]),
  ]);

  const supportedFormats = createSection(
    document,
    "supported-formats",
    "Supported formats",
    [
      createParagraph(
        document,
        "This matrix lists implemented import paths in the repository. Research notes or backlog tasks are not shown as supported features.",
      ),
      createFormatMatrix(document),
    ],
  );

  const formatGuides = createSection(document, "format-guides", "Format guides", [
    createParagraph(
      document,
      "Use these guides to prepare source files before conversion and to understand what the output can reasonably preserve.",
    ),
    createFormatGuideCards(document),
  ]);

  const privacy = createSection(document, "privacy-policy", "Privacy Policy", [
    createParagraph(
      document,
      "File conversion happens in your browser. Files are not uploaded to a project server for conversion.",
    ),
    createParagraph(
      document,
      "Selected files are read with browser APIs, converted in the page, and used to generate a local `.aseprite` download.",
    ),
    createParagraph(
      document,
      "There is no conversion backend that processes artwork for this app. Static hosting may still receive ordinary requests for the page, scripts, styles, and public assets.",
    ),
    createParagraph(
      document,
      "The site may use third-party advertising services in the future, including Google AdSense.",
    ),
    createParagraph(
      document,
      "Third-party vendors, including Google, may use cookies to serve ads.",
    ),
    createParagraph(
      document,
      "Google may use advertising cookies to serve ads based on prior visits to this site or other sites.",
    ),
    createParagraph(
      document,
      "Users can opt out of personalized advertising through Google Ads Settings.",
    ),
    (() => {
      const paragraph = document.createElement("p");
      paragraph.append(
        "Google Ads Settings: ",
        createExternalLink(
          document,
          "https://adssettings.google.com/",
          "Google Ads Settings",
        ),
      );
      return paragraph;
    })(),
    createParagraph(
      document,
      "No payment information is processed by this site. Optional support providers operate on their own external pages.",
    ),
    createParagraph(
      document,
      "Do not upload sensitive or private artwork to unrelated third-party services to troubleshoot a local conversion problem.",
    ),
  ]);

  const limitations = createSection(
    document,
    "conversion-limitations-guide",
    "Conversion limitations",
    [
      createParagraph(
        document,
        "Conversion is best-effort for documented supported subsets. It is not guaranteed to be lossless, perfect, or compatible with every source-application feature.",
      ),
      createList(document, [
        "Flat images do not contain original layers, so original layers cannot be recovered from PNG, spritesheet, GIF, or APNG sources.",
        "Unsupported blend modes, effects, groups, masks, smart objects, adjustment layers, vector layers, tilemaps, and editor-only metadata may be rejected or omitted according to each importer.",
        "Large files can consume significant browser memory because decoded pixels, preview images, frame buffers, and output bytes all live in the browser process.",
        "Browser limits vary by device, operating system, and available memory.",
        "Output may not preserve every feature from Piskel, Pixil/Pixilart, OpenRaster, Pixelorama, Krita, PSD, GIF, or APNG files.",
      ]),
    ],
  );

  const troubleshooting = createSection(
    document,
    "troubleshooting",
    "Troubleshooting",
    [
      createParagraph(
        document,
        "Most conversion failures are caused by choosing the wrong mode, selecting an incomplete file set, or using a source feature outside the documented subset.",
      ),
      createDefinitionList(document, [
        [
          "Unsupported file type",
          "Choose the mode that matches the extension and source format. Renaming a file does not change its internal format.",
        ],
        [
          "Missing JSON metadata",
          "Spritesheet PNG + JSON mode requires both files. Select the matching atlas JSON and image together.",
        ],
        [
          "Invalid spritesheet dimensions",
          "Use the grid preview and exact-fit status to choose rows, columns, and frame size that cover the image.",
        ],
        [
          "Inconsistent PNG dimensions",
          "PNG sequence mode requires every selected frame to share the same canvas size.",
        ],
        [
          "Malformed project file",
          "Open the project in its original editor and save a fresh copy, then retry with a small reproduction if possible.",
        ],
        [
          "Unsupported PSD features",
          "Rasterize text, smart objects, adjustment layers, and effects before saving an RGB 8-bit PSD for import.",
        ],
        [
          "Files are too large",
          "Reduce canvas size, frame count, or layer count; close memory-heavy tabs; or split the animation into smaller batches.",
        ],
        [
          "Output differs from the source",
          "Check the format guide for unsupported features and compare the preview, frame timing, opacity, and layers in Aseprite.",
        ],
        [
          "Download does not start",
          "Check the browser downloads panel, allow downloads for the site, and disable extensions that block Blob downloads.",
        ],
        [
          "Browser memory errors",
          "Retry in an up-to-date desktop browser and simplify the source file before importing.",
        ],
      ]),
    ],
  );

  const faq = createSection(document, "faq", "FAQ", [
    createDefinitionList(document, [
      [
        "Are files uploaded?",
        "No. Conversion reads selected files in the browser and generates the output locally. The app has no conversion upload endpoint.",
      ],
      [
        "Can original layers be recovered from PNG?",
        "No. Flat PNG images, spritesheets, GIF, and APNG files do not contain the original editor layer stack.",
      ],
      [
        "Which formats preserve layers?",
        "Structured project formats can preserve supported layers when the source contains supported layer data: Piskel, Pixil/Pixilart, OpenRaster, Pixelorama, Krita, and PSD have documented limited subsets.",
      ],
      [
        "Can animations be converted?",
        "Yes. PNG sequences, grid spritesheets, spritesheet JSON, Piskel, Pixil/Pixilart, Pixelorama, GIF, APNG, and some documented project-format subsets can produce timeline frames.",
      ],
      [
        "Why was my file rejected?",
        "The file may be malformed, incomplete, too large, from an unsupported format variant, or using features outside the documented subset.",
      ],
      [
        "Why does a converted file look different?",
        "Some source features such as effects, blend modes, masks, editor metadata, and flattened previews may not map to Aseprite output.",
      ],
      [
        "Can I use the site offline after it has loaded?",
        "The app is static and browser-local, but this page does not currently install a dedicated offline service worker. Keep a local copy only if your browser or deployment workflow supports it.",
      ],
      [
        "What browsers are supported?",
        "Use a current desktop browser with File, Blob, canvas, typed-array, and download support. Very old or memory-constrained browsers may fail on large files.",
      ],
      [
        "Is conversion guaranteed to be lossless?",
        "No. The goal is useful editable Aseprite output for documented subsets, not perfect round-trip preservation.",
      ],
      [
        "How can I report a compatibility problem?",
        "Share the smallest original reproduction file that is safe to disclose, plus the import mode, browser, operating system, and exact error message.",
      ],
      [
        "How can I support the project?",
        "Use the Support link if configured. Support is optional and does not unlock hidden conversion features.",
      ],
    ]),
  ]);

  const about = createSection(document, "about", "About", [
    createParagraph(
      document,
      "Sprite to Aseprite Converter is an open-source browser tool for turning supported sprite sources into editable `.aseprite` files.",
    ),
    createParagraph(
      document,
      "The current scope is focused: import supported files, rebuild a SpriteProject timeline, validate it, preview it, and export Aseprite output in the browser.",
    ),
    (() => {
      const paragraph = document.createElement("p");
      paragraph.append(
        "Project repository: ",
        createExternalLink(
          document,
          "https://github.com/khs2325/sprite-to-aseprite",
          "khs2325/sprite-to-aseprite on GitHub",
        ),
      );
      return paragraph;
    })(),
  ]);

  const contact = createSection(document, "contact", "Contact", [
    createParagraph(
      document,
      "For compatibility questions, bug reports, or documentation fixes, use the project repository issue tracker when it is available.",
    ),
    createParagraph(
      document,
      "Do not share private artwork in public reports. A tiny original test sprite or synthetic project file is safer and usually more useful.",
    ),
    createParagraph(
      document,
      "Privacy Policy, Terms, Contact, and Support links are visible from the page navigation or footer.",
    ),
  ]);

  const terms = createSection(document, "terms", "Terms", [
    createParagraph(
      document,
      "Use the converter only with files you have the right to process.",
    ),
    createParagraph(
      document,
      "Conversion is provided as a best-effort tool for documented supported subsets. It is not promised to be perfect, lossless, or compatible with every file variant.",
    ),
    createParagraph(
      document,
      "The site does not provide direct payment processing, backend storage, or private file hosting.",
    ),
  ]);

  container.append(
    howItWorks,
    supportedFormats,
    formatGuides,
    privacy,
    limitations,
    troubleshooting,
    faq,
    about,
    contact,
    terms,
  );
  return container;
}
