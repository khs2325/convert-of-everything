# ReSprite Input Subset

Sprite Converter accepts one `.resprite` project bundle and maps its supported
normal-raster data into the canonical `SpriteProject` model. The file is read,
validated, decompressed, and decoded in the browser. It is not uploaded to a
conversion service.

ReSprite also provides its own Aseprite export. When ReSprite is available and
the project uses features outside this subset, prefer the editor's documented
[Aseprite export](https://resprite.fengeon.com/docs/basic/export).

## Supported Bundle Shape

The importer requires a ZIP bundle with exactly one root whose name ends in
`.resprite`. That root must contain:

- `document.json`
- `meta.json`
- one `CellData/{cell-id}.png` entry for every non-empty concrete cel

The ZIP central directory, local headers, entry names, declared sizes, and CRC32
checksums are validated. Unsafe paths, duplicate names, encrypted entries,
multi-disk archives, ZIP64 entries, unsupported compression methods, and
inconsistent entry metadata are rejected.

## Mapping to `SpriteProject`

| ReSprite data | `SpriteProject` mapping |
| --- | --- |
| `canvasSize` | RGBA canvas width and height |
| `frameDatas` | Contiguous frames in source order |
| `duration` with `frameRate` | `floor(duration * 1000 / frameRate)`, normalized to the supported whole-millisecond range |
| supported clip heads | Forward, reverse, or ping-pong frame tags |
| normal raster `layerDatas` | Layers reversed from ReSprite top-to-bottom order into the model's bottom-to-top order |
| `contentVisible` and layer `opacity` | Layer visibility and 0–255 opacity |
| concrete cell bounds and PNG | Positioned RGBA cel on that frame |
| inherited cell | A new model cel reusing the previous cel pixels and placement |
| empty concrete cell | No cel on that frame |

The importer preserves supported frames, timing, clip tags, layer names, layer
order, visibility, layer opacity, cel positions, and decoded RGBA pixels. It
does not claim universal or lossless ReSprite compatibility.

## Unsupported Features

The importer rejects structural features that the current model cannot
represent accurately:

- layer groups
- clipping masks
- non-normal blend modes
- per-cel opacity other than 1
- malformed or missing cel PNG data
- invalid inherited-cell relationships

Palettes, tilemaps, reference images, Deco modules, editor state, and other
ReSprite-specific metadata are not carried into the generated Aseprite file.
The official ReSprite
[format compatibility notes](https://resprite.fengeon.com/docs/other/other-format)
describe additional differences that can also affect native interchange.

## Browser-Local Limits

The importer checks limits before large allocations. The selected archive is
limited to 32 MiB. Expanded bytes, individual entries, JSON size, canvas pixels,
frames, layers, cels, and total decoded cel pixels have separate conservative
limits. These checks protect the browser tab from malformed or unexpectedly
large archives; they are not claims about ReSprite's own editor limits.

## Verification

After conversion, open the output in Aseprite and compare:

1. canvas width and height;
2. frame count, order, and duration;
3. clip-tag names, ranges, and direction;
4. layer names, bottom-to-top order, visibility, and opacity;
5. concrete and inherited cel placement;
6. transparency and representative pixel colors.

Keep the original `.resprite` file until this verification is complete.
