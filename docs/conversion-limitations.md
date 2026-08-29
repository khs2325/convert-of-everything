# Conversion Limitations Matrix

This matrix summarizes what the converter can and cannot preserve when it
converts supported or planned formats through `SpriteProject`. It is a
preservation guide, not a lossless-conversion claim. Unsupported source data is
rejected clearly or documented as omitted when it does not affect the converted
project.

Artwork and metadata stay in the browser. The converter does not upload source
files to a server or send them to a remote image-processing service.

## Current Supported Inputs

| Input | Layers | Frames | Timing | Effects | Masks | Groups | Palettes | Metadata |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aseprite `.ase` or `.aseprite` | Preserves supported direct normal raster layers. | Rebuilds ordered frames from compressed RGBA image cels. | Positive millisecond durations and supported tags are converted. | Non-normal blend behavior is rejected. | Not represented; files that depend on unsupported structures are rejected. | Groups and nested layers are rejected. | RGBA palette chunks are validated as metadata, but palette identity is not preserved. | Raw chunk order, UUID identity, linked-cel relationships, user data, profiles, slices, tilesets, and editor-only metadata are not preserved. |
| ReSprite `.resprite` | Preserves supported normal raster layer names, order, visibility, opacity, positions, and PNG-backed cel pixels. | Rebuilds concrete and inherited cels across the declared frame timeline. | Frame-rate duration units become normalized whole-millisecond durations; supported clip heads become frame tags. | Non-normal blend modes are rejected. | Clipping masks are rejected. | Layer groups are rejected. | Palettes are not preserved; decoded pixels become RGBA. | Tilemaps, reference images, Deco modules, project/editor metadata, and unsupported bundle entries are not mapped to output. |
| PNG sequence | No source layer data; creates one `Main` layer. | One frame per PNG; all images must share dimensions. | Configurable duration, default 100 ms. | Not present in flat PNGs. | Not present in flat PNGs. | Not present in flat PNGs. | Palette identity is not preserved; pixels become RGBA. | No editor metadata is preserved. |
| Spritesheet grid | No source layer data; creates one `Main` layer. | Grid cells become frames; grid must exactly cover the image. | Default 100 ms per frame. | Not present in flat spritesheets. | Not present in flat spritesheets. | Not present in flat spritesheets. | Palette identity is not preserved; pixels become RGBA. | Grid settings are conversion inputs, not restored editor metadata. |
| Spritesheet PNG + JSON | No source layer data; creates one `Main` layer. | Supported rectangles, trim, and common clockwise rotation are rebuilt. | Per-frame durations are supported; missing values default to 100 ms. | Not preserved. | Not preserved. | Not preserved. | Palette identity is not preserved; pixels become RGBA. | Only the documented frame rectangle, duration, trim, rotation, and supported tag subset is interpreted. Other atlas metadata is not preserved. |
| Piskel `.piskel` | Preserves supported source layers only when present in the documented subset. | Visible frames are converted; hidden frames are skipped and remaining frames are reindexed. | Global FPS becomes one duration for every converted frame; per-frame source durations are not supported. | Not preserved. | Not preserved. | Not preserved. | Palette identity is not preserved; decoded pixels become RGBA. | Project name and description are validated but not exported; other editor state is not preserved. |
| OpenRaster `.ora` | Preserves supported normal PNG-backed raster layers only. | Single-frame subset only; animation is unsupported. | No animation timing is preserved. | Not preserved. | Not preserved. | Not preserved. | Palette identity is not preserved; decoded pixels become RGBA. | Animation data, nested stack semantics, flattened previews, and other editor metadata are not preserved. |
| Pixelorama `.pxo` | Preserves supported normal raster pixel layers only. | Supported frames and full-canvas cels are converted. | Supported frame timing is converted from the documented subset. | Not preserved. | Not preserved. | Group, 3D, audio, tilemap, and unsupported layer types are not preserved. | Palettes are not preserved. | Guides, reference images, linked cels, and arbitrary editor metadata are not preserved. |
| Pixilart `.pixil` | Preserves names, order, opacity, and pixels for supported 2.7.0 `source-over` layers. `active` is not treated as visibility. | Frame-array order with one full-canvas embedded PNG per logical layer is converted. | Positive integer `speed` is interpreted as milliseconds and normalized to the Aseprite output range. | Not preserved; unsupported blends are rejected. | Not preserved. | Not preserved. | Palettes are not preserved; decoded PNG pixels become RGBA. | Only the observed genuine 2.7.0 structure is supported. Other versions, editor metadata, ambiguous identity, effects, external data, and non-PNG payloads are not preserved. Conversion is not guaranteed lossless. |
| Krita `.kra` | Preserves supported 8-bit RGBA paint layers only. | Single-frame subset only; animation timelines are unsupported. | No animation timing is preserved. | Not preserved. | Not preserved. | Not preserved. | Palette and color-profile identity are not preserved. | Flattened previews, vector data, and other editor metadata are not used to recover source layers. |
| PSD `.psd` input | Preserves supported RGB 8-bit raster layers only. | Single-frame subset only; timeline animation is unsupported. | No PSD timeline timing is preserved. | Not preserved. | Not preserved. | Not preserved. | Palette and color-profile identity are not preserved. | Text, smart objects, adjustment layers, linked files, embedded objects, clipping, PSB data, and Photoshop metadata are unsupported. |
| GIF `.gif` | No editable source layer data; rebuilds frames on one generated layer. | Supported frames, offsets, transparency, and disposal behavior are rebuilt. | Supported frame timing is converted. | Not preserved. | Not preserved. | Not preserved. | GIF palette identity is not preserved; pixels become RGBA. | Unsupported extensions and editor metadata are not preserved. |
| APNG `.apng` or animated `.png` | No editable source layer data; rebuilds frames on one generated layer. | Supported frames, offsets, blending, and disposal behavior are rebuilt. | Supported frame timing is converted. | Not preserved. | Not preserved. | Not preserved. | Palette-based APNG input is unsupported; converted pixels are RGBA. | Extra chunks and editor metadata are not preserved. |

## Current Outputs And Future Paths

| Path | Layers | Frames | Timing | Effects | Masks | Groups | Palettes | Metadata |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aseprite output | Preserves normal layers represented by `SpriteProject`. | Writes ordered frames and compressed RGBA image cels. | Writes frame durations and supported tags. | Not preserved. | Not preserved. | Not preserved. | Palette identity is not preserved; output is 32-bit RGBA. | Unsupported source chunks and editor-only metadata are not round-tripped. |
| PNG sequence output | Output is flattened rendered frames, not editable layers. | Writes one image per exported frame. | PNG files do not carry animation timing or tags. | Not preserved. | Not preserved. | Not preserved. | Palette identity is not preserved by RGBA output. | Deterministic filenames carry frame order; editor metadata is not preserved. |
| Spritesheet PNG + JSON output | Output is a flattened sheet, not editable layers. | Writes full-canvas frames to a fixed row-major grid. | JSON records frame durations and supported tags. | Not preserved. | Not preserved. | Not preserved. | Palette identity is not preserved by RGBA output. | The sidecar contains documented rectangles, layout, durations, and tags only. |
| Planned GIF/APNG output | Output is flattened animation, not editable layers. | Frames must fit encoder-specific limits and disposal/blending rules. | Timing may be clamped or quantized according to each format and implementation. | Not preserved. | Not preserved. | Not preserved. | Palette identity is not preserved; GIF output may require a generated palette. | Editor metadata is not preserved. |
| Future PSD output | Planned as a narrow static layered PSD subset, not `.aseprite` to PSD fidelity. | First useful subset should export one selected frame or one static frame document. | Aseprite frame durations, tags, and Photoshop timeline metadata are out of scope for the first PSD writer. | Not preserved. | Not preserved. | Not preserved. | Palette and color-profile identity are not preserved. | Smart objects, adjustment layers, text editability, layer comps, linked files, and Photoshop-private metadata are out of scope. |

## Flat-Image Layer Recovery

PNG sequences, spritesheets, GIF, and APNG contain rendered pixels rather than
editable source layer structure. They can rebuild timeline frames and convert
frames, but the converter cannot recover original layers, effects, masks,
groups, palettes, or editor metadata that are absent from the source.

Project formats such as ReSprite, Piskel, OpenRaster, Pixelorama, Pixil/Pixilart, Krita,
and PSD can preserve layers only when the source file contains layer data and the importer
supports that documented subset. A flattened preview or composite image is not
used to reconstruct missing source layers.

## Bidirectional Caveats

Bidirectional conversion can preserve only the intersection represented
by the importer, `SpriteProject`, and the selected exporter. Aseprite, PSD, PNG
sequences, spritesheets, GIF, and APNG expose different feature sets, so a round
trip may keep frame pixels and selected timing or layer data while dropping
unsupported tags, palettes, effects, masks, groups, color profiles, and editor
metadata.

Future PSD output should be described as supported layered raster interchange
for a documented subset, not as lossless `.aseprite` round-trip conversion or
Photoshop project reconstruction.
