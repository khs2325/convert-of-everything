# Output Format Selector

Status: Aseprite, PNG sequence, and spritesheet PNG + JSON implemented.

The current product exports three browser-local output paths from
`SpriteProject`. The selector keeps that boundary: importers
produce `SpriteProject`, exporters consume `SpriteProject`, and downloads are
created as local `Blob` objects without uploading artwork.

## UX

Show output format as a single selector near the download action after a
project has been converted. The default selection is Aseprite because it is the
current implemented export path and best matches the product goal of rebuilding
an editable Aseprite timeline.

Each option should have a short capability note:

| Output | State | User-facing note |
| --- | --- | --- |
| Aseprite `.aseprite` | Enabled when a valid `SpriteProject` exists. | Editable Aseprite timeline. |
| PNG sequence | Enabled when a valid `SpriteProject` exists and aggregate pixel limits pass. | Export one flattened PNG per frame. |
| Spritesheet PNG + JSON | Enabled when a valid `SpriteProject` exists and sheet limits pass. | Export a flattened row-major sheet plus rectangles, durations, and supported tags. |
| GIF | Disabled until implemented. | Export animated frames with GIF timing limits. |
| APNG | Disabled until implemented. | Export animated PNG frames where browser support allows download. |
| PSD `.psd` | Research-only and disabled. | Research target for layered raster interchange; no support promised. |

Do not describe any option as perfect, universal, or able to recover layers
from flat sources. Flat outputs such as PNG sequence, spritesheet, GIF, and APNG
may flatten visible layers for each frame. Layered output formats may preserve
layers only when the `SpriteProject` contains layer data that the exporter
explicitly supports.

## Disabled States

The selector exposes implemented formats. Any future option must stay disabled
until it has a registered exporter and should explain the reason in product
terms.

All outputs are disabled until conversion produces a valid `SpriteProject`.
Format-specific exporters may also disable download when the project exceeds
their documented limits, such as GIF palette or timing constraints, APNG encoder
scope, spritesheet dimensions, frame count, or unsupported layer behavior.

Research-only PSD must stay disabled until a separate feasibility task defines
the writer subset, browser-local implementation strategy, fixtures, validation,
and copy. It must not imply bidirectional PSD conversion.

## Architecture

The download UI dispatches to an exporter only after validating a shared
`SpriteProject`. A future registry may replace the small current dispatch when
more formats are implemented:

```ts
type OutputFormat = {
  id: string;
  label: string;
  extension: string;
  implemented: boolean;
  exportProject?: (project: SpriteProject) => Promise<Blob>;
};
```

Exporter modules should remain independent from importers and UI components.
Each exporter validates the `SpriteProject` fields it can encode and returns a
clear, safe diagnostic for unsupported output conditions. UI code should only
choose a format, call the registered exporter, create a local object URL, start
the download, and revoke the URL.

## Implementation Status

1. Aseprite output remains the default editable-project option.
2. PNG sequence output creates one deterministic flattened PNG per frame.
3. Spritesheet output creates a deterministic row-major PNG and JSON sidecar
   with explicit dimensions, pixel limits, frame order, durations, and tags.
4. Add GIF export only after documenting palette, timing, frame-count, and
   transparency limits.
5. Add APNG export only after documenting encoder scope, chunk validation,
   timing, disposal/blend behavior, and browser download behavior.
6. Keep PSD as research-only until a separate writer feasibility note proves a
   narrow browser-local subset and fixture strategy.

Each implementation task should update product copy, architecture notes, core
exporter tests, and UI disabled/enabled states together. Binary writer changes
need golden or structural tests before the option can be enabled.
