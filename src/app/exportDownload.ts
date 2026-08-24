import type { SpriteProject } from "../core/SpriteProject";
import { exportAseprite } from "../core/exporters/aseprite";
import {
  exportPngSequence,
  sanitizeFilenameStem,
  type ExportedFile,
} from "../core/exporters/pngSequence";
import { exportSpritesheet } from "../core/exporters/spritesheet";
import { isValidSpriteProject } from "../core/validation";

const DEFAULT_FILENAME = "sprite-project.aseprite";
const EXPORT_ERROR_PREFIX = "Could not export the Aseprite file.";

type DownloadLink = Pick<HTMLAnchorElement, "click" | "download" | "href">;

export type ExportDownloadDependencies = {
  createDownloadLink?: () => DownloadLink;
  createObjectUrl?: (blob: Blob) => string;
  exportProject?: (project: SpriteProject) => Uint8Array;
  exportPngSequence?: typeof exportPngSequence;
  exportSpritesheet?: typeof exportSpritesheet;
  revokeObjectUrl?: (url: string) => void;
};

export type ExportDownloadControl = {
  destroy(): void;
  exportCurrentProject(): boolean;
  setProject(project: unknown): void;
  setFilenameStem?(filenameStem: string): void;
};

export type ExportDownloadUi = ExportDownloadControl & {
  element: HTMLElement;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return `${EXPORT_ERROR_PREFIX} ${error.message}`;
  }
  return EXPORT_ERROR_PREFIX;
}

export function bindExportDownloadControl(
  button: HTMLButtonElement,
  errorOutput: HTMLElement,
  filename = DEFAULT_FILENAME,
  dependencies: ExportDownloadDependencies = {},
): ExportDownloadControl {
  let currentProject: unknown = null;

  const clearError = (): void => {
    errorOutput.hidden = true;
    errorOutput.textContent = "";
  };

  const showError = (message: string): void => {
    errorOutput.textContent = message;
    errorOutput.hidden = false;
  };

  const exportCurrentProject = (): boolean => {
    clearError();

    if (!isValidSpriteProject(currentProject)) {
      button.disabled = true;
      showError("Load a valid sprite project before exporting.");
      return false;
    }

    let objectUrl: string | undefined;
    try {
      const bytes = (dependencies.exportProject ?? exportAseprite)(
        currentProject,
      );
      const blobBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(blobBuffer).set(bytes);
      const blob = new Blob([blobBuffer], { type: "application/x-aseprite" });
      objectUrl = (dependencies.createObjectUrl ?? URL.createObjectURL)(blob);

      const link = (
        dependencies.createDownloadLink ?? (() => document.createElement("a"))
      )();
      link.href = objectUrl;
      link.download = filename;
      link.click();
      return true;
    } catch (error) {
      showError(getErrorMessage(error));
      return false;
    } finally {
      if (objectUrl !== undefined) {
        (dependencies.revokeObjectUrl ?? URL.revokeObjectURL)(objectUrl);
      }
    }
  };

  const handleClick = (): void => {
    exportCurrentProject();
  };

  button.disabled = true;
  clearError();
  button.addEventListener("click", handleClick);

  return {
    destroy(): void {
      button.removeEventListener("click", handleClick);
    },
    exportCurrentProject,
    setProject(project: unknown): void {
      currentProject = project;
      button.disabled = !isValidSpriteProject(project);
      clearError();
    },
  };
}

export function mountExportDownloadUi(
  container: HTMLElement,
  filename = DEFAULT_FILENAME,
  dependencies: ExportDownloadDependencies = {},
): ExportDownloadUi {
  const document = container.ownerDocument;
  const element = document.createElement("section");
  const heading = document.createElement("h3");
  const formatLabel = document.createElement("label");
  const formatSelect = document.createElement("select");
  const filenameLabel = document.createElement("label");
  const filenameInput = document.createElement("input");
  const columnsLabel = document.createElement("label");
  const columnsInput = document.createElement("input");
  const note = document.createElement("p");
  const button = document.createElement("button");
  const statusOutput = document.createElement("p");
  const errorOutput = document.createElement("p");
  const downloadList = document.createElement("ul");

  for (const [value, label] of [
    ["aseprite", "Aseprite project (.aseprite)"],
    ["png-sequence", "PNG sequence"],
    ["spritesheet", "Spritesheet PNG + JSON"],
  ] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    formatSelect.append(option);
  }

  element.setAttribute("aria-label", "Converted file export");
  heading.textContent = "Choose an output format";
  formatLabel.textContent = "Output format";
  formatLabel.append(formatSelect);
  filenameLabel.textContent = "Filename";
  filenameInput.type = "text";
  filenameInput.value = sanitizeFilenameStem(filename);
  filenameLabel.append(filenameInput);
  columnsLabel.textContent = "Spritesheet columns";
  columnsInput.type = "number";
  columnsInput.min = "1";
  columnsInput.step = "1";
  columnsInput.value = "1";
  columnsLabel.append(columnsInput);
  note.className = "export-note";
  button.type = "button";
  button.textContent = "Prepare downloads";
  statusOutput.setAttribute("role", "status");
  statusOutput.setAttribute("aria-live", "polite");
  errorOutput.setAttribute("role", "alert");
  errorOutput.setAttribute("aria-live", "assertive");
  downloadList.className = "download-list";
  element.append(
    heading,
    formatLabel,
    filenameLabel,
    columnsLabel,
    note,
    button,
    statusOutput,
    errorOutput,
    downloadList,
  );
  container.append(element);

  let currentProject: SpriteProject | null = null;
  let objectUrls: string[] = [];

  const clearDownloads = (): void => {
    for (const url of objectUrls) {
      (dependencies.revokeObjectUrl ?? URL.revokeObjectURL)(url);
    }
    objectUrls = [];
    downloadList.replaceChildren();
    statusOutput.textContent = "";
  };

  const syncFormat = (): void => {
    clearDownloads();
    const format = formatSelect.value;
    columnsLabel.hidden = format !== "spritesheet";
    note.textContent =
      format === "aseprite"
        ? "Keeps the editable SpriteProject timeline and supported raster layers."
        : format === "png-sequence"
          ? "Creates one flattened PNG per frame. Layer structure, timing, and frame tags are not stored in PNG files."
          : "Creates one flattened row-major PNG sheet plus JSON with frame rectangles, durations, and frame tags.";
  };

  const prepareFiles = (): ExportedFile[] => {
    if (currentProject === null) return [];
    const stem = sanitizeFilenameStem(filenameInput.value);
    if (formatSelect.value === "png-sequence") {
      return (dependencies.exportPngSequence ?? exportPngSequence)(currentProject, stem);
    }
    if (formatSelect.value === "spritesheet") {
      const result = (dependencies.exportSpritesheet ?? exportSpritesheet)(currentProject, {
        columns: Number(columnsInput.value),
        filenameStem: stem,
      });
      return [result.imageFile, result.jsonFile];
    }
    return [{
      bytes: (dependencies.exportProject ?? exportAseprite)(currentProject),
      filename: `${stem}.aseprite`,
      mimeType: "application/x-aseprite",
    }];
  };

  const exportCurrentProject = (): boolean => {
    clearDownloads();
    errorOutput.hidden = true;
    errorOutput.textContent = "";
    if (currentProject === null) {
      button.disabled = true;
      errorOutput.textContent = "Load a valid sprite project before exporting.";
      errorOutput.hidden = false;
      return false;
    }
    try {
      const files = prepareFiles();
      for (const file of files) {
        const buffer = new ArrayBuffer(file.bytes.byteLength);
        new Uint8Array(buffer).set(file.bytes);
        const url = (dependencies.createObjectUrl ?? URL.createObjectURL)(
          new Blob([buffer], { type: file.mimeType }),
        );
        objectUrls.push(url);
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = url;
        link.download = file.filename;
        link.textContent = `Download ${file.filename}`;
        item.append(link);
        downloadList.append(item);
      }
      statusOutput.textContent = `${files.length} download ${files.length === 1 ? "file is" : "files are"} ready.`;
      return true;
    } catch (error) {
      clearDownloads();
      errorOutput.textContent = error instanceof Error && error.message.length > 0
        ? `Could not prepare downloads. ${error.message}`
        : "Could not prepare downloads.";
      errorOutput.hidden = false;
      return false;
    }
  };

  const handleClick = (): void => { exportCurrentProject(); };
  const handleFormatChange = (): void => { syncFormat(); };
  button.disabled = true;
  errorOutput.hidden = true;
  formatSelect.addEventListener("change", handleFormatChange);
  button.addEventListener("click", handleClick);
  syncFormat();

  return {
    destroy(): void {
      clearDownloads();
      formatSelect.removeEventListener("change", handleFormatChange);
      button.removeEventListener("click", handleClick);
    },
    element,
    exportCurrentProject,
    setFilenameStem(filenameStem: string): void {
      filenameInput.value = sanitizeFilenameStem(filenameStem);
      clearDownloads();
    },
    setProject(project: unknown): void {
      clearDownloads();
      currentProject = isValidSpriteProject(project) ? project : null;
      button.disabled = currentProject === null;
      errorOutput.hidden = true;
      errorOutput.textContent = "";
      if (currentProject !== null) {
        columnsInput.max = String(currentProject.frames.length);
        columnsInput.value = String(Math.ceil(Math.sqrt(currentProject.frames.length)));
      }
    },
  };
}
