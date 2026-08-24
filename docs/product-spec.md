# Product Spec

## Product name

Convert of Everything

## Goal

Create a static browser-based app that helps users convert sprite-related files into editable `.aseprite` files.

The tool should help users rebuild an editable Aseprite timeline from assets such as PNG sequences, spritesheets, and metadata JSON files.

Current input-format status is summarized in
[supported-formats.md](supported-formats.md), including supported subsets,
planned scope, research-only notes, and unsupported features. Preservation
limits across supported and planned paths are summarized in
[conversion-limitations.md](conversion-limitations.md).

## MVP scope

1. PNG sequence -> `.aseprite`
2. Spritesheet grid -> `.aseprite`
3. Spritesheet PNG + JSON -> `.aseprite`

## Non-goals for MVP

- Server-side file upload
- Cloud storage of user artwork
- PSD import
- Full layer recovery from flat PNG files
- Full `.aseprite` feature parity
- Auto-merge of AI-generated code

## Supported post-MVP Piskel import

Piskel (`.piskel`) is supported as a browser-local import path through the
canonical `SpriteProject` model and the Aseprite exporter. The implemented
path includes fixtures, an explicit [supported subset](piskel-format.md), a
core importer, conversion integration tests, browser UI wiring, and user
documentation.

The supported subset is explicit about model versions, nested layer
records, embedded PNG chunks/layouts, and global FPS-to-frame-duration
conversion. It preserves layer names, order, opacity/visibility, frames,
timing, and decoded cel pixels only when those values are represented by the
supported `.piskel` source. Malformed or unsupported data is rejected clearly
rather than silently inventing or dropping source structure.

This support is not universal, perfect, or lossless Piskel conversion. Artwork
is never uploaded or remotely processed.

## Supported post-MVP GIF and APNG import

GIF and APNG are supported as browser-local import paths through the canonical
`SpriteProject` model and the existing Aseprite exporter. The browser UI accepts
one `.gif` in the [documented GIF subset](gif-format.md), or one `.apng`/animated
`.png` in the [documented APNG subset](apng-format.md), and exposes safe
importer-authored diagnostics for malformed or unsupported files.

These flat animation sources rebuild supported frames and timing on a generated
layer. They do not provide editable source-layer data, so the product does not
claim layer preservation or recovery. Source artwork is processed locally in
the browser and is never uploaded.

## Supported post-MVP OpenRaster import

OpenRaster (`.ora`) is supported as a browser-local import path through the
canonical `SpriteProject` model and the existing Aseprite exporter. The browser
UI accepts exactly one `.ora` file and routes it to the documented
[OpenRaster format subset](openraster-format.md), covering a single-frame ZIP
container with `mimetype`, `stack.xml`, normal PNG-backed raster layers, canvas
dimensions, layer names, source order, visibility, opacity, signed x/y offsets,
and decoded RGBA pixels.

This support preserves layers only when the `.ora` source contains supported
raster layer data. It does not implement animation, groups, masks, effects,
non-normal blend modes, or full/lossless OpenRaster conversion. Artwork is
processed locally and is never uploaded.

## Supported post-MVP Pixelorama import

Pixelorama (`.pxo`) is supported as a browser-local import path through the
canonical `SpriteProject` model and the existing Aseprite exporter. The browser
UI accepts exactly one `.pxo` file and routes it to the documented
[Pixelorama format subset](pixelorama-format.md): ZIP `.pxo` files with RGBA8
raw cel data, normal pixel layers, supported frame timing, layer order, layer
names, visibility, opacity, and full-canvas cels.

This support preserves layers only when the `.pxo` source contains supported
raster pixel layer data. It rejects unsupported tilemaps, effects, blend modes,
layer types, missing image data, and ambiguous metadata clearly rather than
inventing semantics. The UI exposes safe importer-authored diagnostics without
stack traces or raw source contents. Artwork is processed locally and is never
uploaded.

## Supported post-MVP Krita import

Krita (`.kra`) is supported as a browser-local import path through the
canonical `SpriteProject` model and the existing Aseprite exporter. The browser
UI accepts exactly one `.kra` file and routes it to the documented
[Krita format subset](krita-format.md): single-frame 8-bit RGBA paint layers
with fixture-backed native raw tile payloads, normal compositing, layer names,
order, visibility, opacity, offsets, and decoded pixels.

This support is deliberately minimal. It rejects unsupported Krita features such
as masks, vector layers, animation
timelines, unsupported color depths or profiles, effects, and missing native
paint-layer payloads. Flattened `preview.png` and `mergedimage.png` entries are
not used to recover source layers. Artwork is processed locally and is never
uploaded.

## Supported post-MVP PSD import

PSD (`.psd`) is supported as a browser-local import path through the canonical
`SpriteProject` model and the existing Aseprite exporter. The browser UI accepts
exactly one `.psd` file and routes it to the documented
[PSD format subset](psd-format.md): version-1 RGB 8-bit PSD files with direct
normal raster layers and one generated frame.

This support preserves layers only when the PSD source contains supported
raster layer data. It does not implement full Photoshop compatibility. Text
layers, smart objects, adjustment layers, effects, masks, groups, PSB files,
non-RGB color modes, high bit depths, and timeline animation are unsupported
and must be rejected or documented without implying lossless conversion.
Artwork must remain local to the browser and must never be uploaded.

## Supported post-MVP Pixil/Pixilart import

Pixilart (`.pixil`) is supported as a browser-local import path through the
canonical `SpriteProject` model and Aseprite exporter. The browser UI accepts
exactly one file in the [observed Pixilart 2.7.0 subset](pixil-format.md), using
the genuine `application/type/version/frames/layers/src` structure with
embedded full-canvas PNGs and `source-over` layers.

The importer preserves canvas size, frame and layer order, layer names,
opacity, per-frame millisecond timing, and decoded pixels when the source
contains the supported data. `active` is not mapped to visibility. Alternate
versions, ambiguous identity, external/non-PNG payloads, non-normal blends, and
unverified features are rejected. This is limited project-file import, not
full or lossless compatibility. Files remain local and are never uploaded.

## Additional free/open art tool project formats

Implemented and researched project-format work focuses on small, deterministic,
browser-local subsets rather than broad compatibility claims:

1. GIMP `.xcf` is research-only at first because it is a living GIMP-native
   format tied closely to GIMP internals. The
   [XCF feasibility note](gimp-xcf-feasibility.md) recommends no direct importer
   task now and prefers OpenRaster for GIMP interchange.
2. LibreSprite/Aseprite `.ase` and `.aseprite` input now has a tested first
   subset for 32-bit RGBA documents, direct normal raster layers, compressed
   image cels, frame timing, and supported tags. See the
   [input feasibility note](aseprite-input-feasibility.md) for explicit limits.
For every planned format, the converter should rebuild timelines, convert
supported frames, and preserve supported raster layer data only when that data
exists in the documented source subset. It must not upload artwork, add
server-side processing, or imply lossless conversion for unsupported source
features.

## Post-MVP compatibility status

Completed compatibility work expands the browser-local architecture while
keeping each claim tied to its tested subset:

1. TexturePacker trimmed frames, supported 90-degree clockwise rotation, and
   clearer atlas diagnostics are implemented for the documented JSON subset.
2. Optional SpriteProject frame tags are mapped from supported Aseprite JSON.
   The Aseprite and spritesheet JSON exporters now encode the supported tag
   subset; richer tag metadata remains outside the model.

Flat atlas sources do not provide editable source-layer data, so those paths
rebuild frames on a generated layer rather than claim layer recovery. All
planned processing remains in the browser with no artwork upload or server
conversion.

## Output format selector

The implemented selector offers Aseprite, PNG sequence, and spritesheet PNG +
JSON after conversion to a valid `SpriteProject`. Aseprite remains the default.
GIF, APNG, and research-only PSD output remain disabled until their
browser-local exporter scope, limits, and tests exist. See
[output-format-selector.md](output-format-selector.md).

PSD output feasibility is documented in
[psd-output-feasibility.md](psd-output-feasibility.md). The cautious target is
a minimal RGB 8-bit layered PSD for a static frame, preserving supported layer
names, visibility, opacity, and RGBA image data from `SpriteProject`. It is not
a Photoshop timeline export and must not be described as lossless `.aseprite`
round-trip conversion.

PNG sequence output is implemented as one deterministic flattened RGBA PNG per
frame. Its filenames, frame order, browser-local downloads, and layer/tag
limitations are documented in
[png-sequence-output.md](png-sequence-output.md).

Spritesheet PNG plus JSON output is implemented as a deterministic row-major
fixed grid with transparency, frame durations, and supported tags in the JSON
sidecar. Layers and source editor metadata are not preserved in this flattened
output. See
[spritesheet-output.md](spritesheet-output.md).

## Bidirectional conversion policy

Bidirectional conversion must not be marketed or documented as inherently
lossless. Aseprite, PSD, PNG sequences, spritesheets, GIF, and APNG have
different feature sets, and `SpriteProject` intentionally stores normalized
sprite data rather than every source-format field. A round trip may omit tags,
palettes, effects, groups, masks, editor metadata, or other unsupported
features unless that exact path has documented model support, exporter support,
and tests.

Flat formats such as PNG sequences, spritesheets, GIF, and APNG contain
rendered frame pixels, not editable source layer structure. They can be used to
rebuild timeline frames, but they cannot recover original source layers.

## Core user promise

User files stay in the browser whenever the web app processes artwork.
Selected files are read with browser APIs and are not uploaded to a project
server for conversion. Generated downloads are created locally from converted
bytes in the browser. Voluntary file sharing in issue trackers, support
requests, cloud drives, chat tools, external validators, or other services is
outside the browser-local conversion flow and must not be described as private
project processing.

## Accurate wording policy

Allowed:

- "Convert frames into an editable Aseprite timeline."
- "Preserve layers when the source format contains layer data."
- "Rebuild animation frames from a spritesheet."

Not allowed:

- "Recover lost layers from a flat PNG."
- "Lossless conversion" unless proven by tests for that exact path.
- "Perfectly restores the original Aseprite file."
