import { describe, expect, it, vi } from "vitest";

import type { SpriteProject } from "../core/SpriteProject";
import { bindExportDownloadControl, mountExportDownloadUi } from "./exportDownload";

type ButtonStub = {
  disabled: boolean;
  listener?: () => void;
};

function createButton(): HTMLButtonElement & ButtonStub {
  const button: ButtonStub = { disabled: false };
  return Object.assign(button, {
    addEventListener(_type: string, listener: () => void): void {
      button.listener = listener;
    },
    removeEventListener(_type: string, listener: () => void): void {
      if (button.listener === listener) {
        button.listener = undefined;
      }
    },
  }) as HTMLButtonElement & ButtonStub;
}

function createErrorOutput(): HTMLElement {
  return { hidden: false, textContent: "stale error" } as HTMLElement;
}

function createProject(): SpriteProject {
  return {
    width: 1,
    height: 1,
    colorMode: "rgba",
    frames: [{ index: 0, durationMs: 100 }],
    layers: [
      {
        id: "main",
        name: "Main",
        visible: true,
        opacity: 255,
        cels: [],
      },
    ],
  };
}

type Listener = EventListenerOrEventListenerObject;

class ElementStub {
  readonly attributes = new Map<string, string>();
  readonly children: ElementStub[] = [];
  readonly listeners = new Map<string, Listener>();
  className = "";
  disabled = false;
  download = "";
  hidden = false;
  href = "";
  max = "";
  min = "";
  step = "";
  textContent = "";
  type = "";
  value = "";

  constructor(
    readonly tagName: string,
    readonly ownerDocument: DocumentStub,
  ) {}

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, listener);
  }

  append(...children: ElementStub[]): void {
    for (const child of children) {
      this.children.push(child);
      if (this.tagName === "select" && child.tagName === "option" && this.value === "") {
        this.value = child.value;
      }
    }
  }

  removeEventListener(type: string, listener: Listener): void {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  replaceChildren(...children: ElementStub[]): void {
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

describe("bindExportDownloadControl", () => {
  it("disables export until a valid SpriteProject is loaded", () => {
    const button = createButton();
    const errorOutput = createErrorOutput();
    const control = bindExportDownloadControl(button, errorOutput);

    expect(button.disabled).toBe(true);
    expect(errorOutput.hidden).toBe(true);

    control.setProject({ width: 0 });
    expect(button.disabled).toBe(true);

    control.setProject(createProject());
    expect(button.disabled).toBe(false);
    expect(errorOutput.textContent).toBe("");
  });

  it("exports to a Blob and starts a local .aseprite download", async () => {
    const button = createButton();
    const errorOutput = createErrorOutput();
    const link = { click: vi.fn(), download: "", href: "" };
    const createObjectUrl = vi.fn((_blob: Blob) => "blob:aseprite-file");
    const revokeObjectUrl = vi.fn();
    const exportProject = vi.fn(() => new Uint8Array([1, 2, 3]));
    const control = bindExportDownloadControl(
      button,
      errorOutput,
      "walk-cycle.aseprite",
      {
        createDownloadLink: () => link,
        createObjectUrl,
        exportProject,
        revokeObjectUrl,
      },
    );
    const project = createProject();

    control.setProject(project);
    button.listener?.();

    expect(exportProject).toHaveBeenCalledWith(project);
    expect(createObjectUrl).toHaveBeenCalledOnce();
    const blob = createObjectUrl.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/x-aseprite");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(link).toMatchObject({
      download: "walk-cycle.aseprite",
      href: "blob:aseprite-file",
    });
    expect(link.click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:aseprite-file");
    expect(errorOutput.hidden).toBe(true);
  });

  it("shows a clear error and does not download when export fails", () => {
    const button = createButton();
    const errorOutput = createErrorOutput();
    const link = { click: vi.fn(), download: "", href: "" };
    const control = bindExportDownloadControl(
      button,
      errorOutput,
      undefined,
      {
        createDownloadLink: () => link,
        exportProject: () => {
          throw new Error("Frame duration is out of range.");
        },
      },
    );

    control.setProject(createProject());

    expect(control.exportCurrentProject()).toBe(false);
    expect(link.click).not.toHaveBeenCalled();
    expect(errorOutput.hidden).toBe(false);
    expect(errorOutput.textContent).toBe(
      "Could not export the Aseprite file. Frame duration is out of range.",
    );
  });

  it("removes the click handler when destroyed", () => {
    const button = createButton();
    const control = bindExportDownloadControl(button, createErrorOutput());

    expect(button.listener).toBeTypeOf("function");
    control.destroy();
    expect(button.listener).toBeUndefined();
  });
});

describe("mountExportDownloadUi", () => {
  it("synchronizes a route-selected output with the format selector", () => {
    const document = new DocumentStub();
    const container = document.createElement("main");
    const onFormatChange = vi.fn();
    const control = mountExportDownloadUi(
      container as unknown as HTMLElement,
      undefined,
      { onFormatChange },
    );
    const section = container.children[0];
    const formatSelect = section.children[1].children[0];
    const note = section.children[4];

    expect(formatSelect.value).toBe("aseprite");
    expect(onFormatChange).toHaveBeenLastCalledWith("aseprite");
    control.setFormat("spritesheet");
    expect(formatSelect.value).toBe("spritesheet");
    expect(note.textContent).toContain("row-major PNG sheet plus JSON");
    expect(onFormatChange).toHaveBeenLastCalledWith("spritesheet");
  });

  it("revokes partial object URLs and removes partial links when preparation fails", () => {
    const document = new DocumentStub();
    const container = document.createElement("main");
    const revokeObjectUrl = vi.fn();
    const createObjectUrl = vi.fn()
      .mockReturnValueOnce("blob:first")
      .mockImplementationOnce(() => { throw new Error("URL allocation failed"); });
    const control = mountExportDownloadUi(
      container as unknown as HTMLElement,
      undefined,
      {
        createObjectUrl,
        revokeObjectUrl,
        exportPngSequence: () => [
          { bytes: new Uint8Array([1]), filename: "frame-1.png", mimeType: "image/png" },
          { bytes: new Uint8Array([2]), filename: "frame-2.png", mimeType: "image/png" },
        ],
      },
    );
    const section = container.children[0];
    const formatSelect = section.children[1].children[0];
    const errorOutput = section.children[7];
    const downloadList = section.children[8];
    formatSelect.value = "png-sequence";
    control.setProject(createProject());

    expect(control.exportCurrentProject()).toBe(false);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:first");
    expect(downloadList.children).toHaveLength(0);
    expect(errorOutput.hidden).toBe(false);
    expect(errorOutput.textContent).toContain("URL allocation failed");
  });
});
