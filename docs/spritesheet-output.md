# Spritesheet Output

Status: implemented as one deterministic row-major flattened PNG plus an
Aseprite-compatible JSON sidecar containing rectangles, durations, and
supported frame tags. Trimming, rotation, and atlas packing remain unsupported.

Spritesheet output is a browser-local exporter that consumes
`SpriteProject` and creates local downloads. It is intended for imported
Aseprite timelines and any other supported input that has already been
normalized into the shared model. It must not upload artwork or inspect raw
source parser state.

## First Exporter Subset

The first subset exports two files:

- `name.png`: one flattened RGBA spritesheet.
- `name.json`: one metadata sidecar describing frame rectangles, durations, and
  layout.

The exporter is deliberately small:

- Fixed-size grid cells only.
- One sheet image only.
- Row-major frame placement.
- No trimming.
- No rotation.
- No atlas packing.
- No per-layer sheets.
- No claim of lossless conversion or recovery of source editor data.

## Frame Rendering

Each output frame is composited into a transparent `project.width` by
`project.height` canvas before being copied into the sheet. Visible layers are
drawn in project layer order using their opacity and cel offsets. Hidden layers
are ignored. Pixels outside the project canvas are clipped.

The first subset rejects invalid projects instead of guessing:

- Frame indices must be deterministic and unique.
- Frame durations must be finite non-negative millisecond values.
- The project must use RGBA color mode.
- The project must contain at least one frame.
- The project dimensions must be positive integers.

## Grid Layout

Frames are placed in timeline order from left to right, then top to bottom.
Timeline order is the validated `SpriteProject.frames` order; if the
implementation later requires contiguous numeric indices, that must be enforced
before export.

Without UI controls, the first subset should use a deterministic automatic
layout:

```text
columns = ceil(sqrt(frameCount))
rows = ceil(frameCount / columns)
sheetWidth = columns * project.width
sheetHeight = rows * project.height
```

Unused cells in the last row remain fully transparent and are not listed as
frames in JSON. Later work can add explicit columns, max-width constraints, or
multi-sheet output after those behaviors are specified and tested.

## Transparency

The PNG stores straight RGBA pixels with alpha preserved from the flattened
frame compositor. The exporter does not add a matte color, checkerboard
background, or opaque fill. Fully transparent padding from unused grid cells
must remain transparent.

## JSON Metadata

The sidecar uses the supported Aseprite-compatible JSON array layout so the
project's existing spritesheet JSON importer can read its rectangles, timing,
and frame tags again:

```json
{
  "frames": [
    {
      "filename": "name-0001.png",
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "rotated": false,
      "trimmed": false,
      "duration": 100
    }
  ],
  "meta": {
    "app": "Convert of Everything / Aseprite-compatible",
    "version": "1",
    "image": "name-sheet.png",
    "format": "RGBA8888",
    "size": { "w": 512, "h": 256 },
    "scale": "1",
    "frameTags": []
  }
}
```

`duration` is copied from each `SpriteFrame.durationMs` so animation timing can be
reconstructed by consumers that read the sidecar. Frame rectangle width and
height match the fixed cell size in the first subset.

## Limitations

Spritesheet output exports flattened frame pixels and timing metadata. It does
not preserve editable layer structure in the PNG or JSON. Layers can only be
preserved by source formats and output formats that both contain layer data and
have explicit model and exporter support.

Supported `SpriteProject.frameTags` are written to the JSON sidecar as name,
inclusive frame range, and playback direction. Tag colors and other Aseprite
editor metadata are not represented by the current model or exporter.

Source-specific metadata is not round-tripped. Aseprite chunks, writer version,
UUIDs, slices, palettes, color profiles, tilemaps, linked-cel relationships,
user properties, and raw chunk ordering are outside this output plan unless a
future task adds tested fields to the shared model and schema.
