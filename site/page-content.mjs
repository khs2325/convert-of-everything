export const PAGE_CONTENT = {
  "/guides/": `
    <p>A successful conversion starts by choosing the format that still contains the information you care about. A folder of rendered PNG frames is excellent for rebuilding motion, but it has already discarded the editor structure that separated ink, color, and effects. A project file may retain that structure, yet only if its version and features fall inside the importer's documented subset.</p>

    <h2>Start with the file you actually have</h2>
    <div class="card-grid">
      <a class="link-card" href="/guides/aseprite-to-png-spritesheet/"><strong>Aseprite to PNG outputs</strong><span>Read a supported 32-bit RGBA project and create flattened frame PNGs or a spritesheet with JSON metadata.</span></a>
      <a class="link-card" href="/guides/png-sequence-to-aseprite/"><strong>Separate PNG frames</strong><span>Use a PNG sequence when each image is one complete animation frame and every canvas has compatible dimensions.</span></a>
      <a class="link-card" href="/guides/spritesheet-to-aseprite/"><strong>One packed spritesheet</strong><span>Use an exact grid for equal cells, or matching JSON when an atlas uses rectangles, trimming, or rotation.</span></a>
      <a class="link-card" href="/guides/pixilart-to-aseprite/"><strong>Pixilart 2.7 project</strong><span>Use the observed genuine 2.7 project structure to preserve the supported cross-frame raster layers.</span></a>
      <a class="link-card" href="/guides/piskel-to-aseprite/"><strong>Piskel project</strong><span>Use a supported model-version-2 file when the project layers and global FPS are still available.</span></a>
      <a class="link-card" href="/guides/gif-apng-to-aseprite/"><strong>GIF or APNG animation</strong><span>Decode rendered animation frames, timing, transparency, and supported compositing into one generated layer.</span></a>
      <a class="link-card" href="/guides/project-files-to-aseprite/"><strong>PSD, Krita, OpenRaster, or Pixelorama</strong><span>Compare the deliberately narrow raster subsets before expecting layers, opacity, offsets, or animation.</span></a>
    </div>

    <h2>Pixels and editor structure answer different questions</h2>
    <p>The converter maps every accepted source into one internal <code>SpriteProject</code>. Rendered image formats mainly answer “what pixels should appear at this moment?” Project formats may also answer “which layer owns these pixels, where is its cel, and what opacity applies?” Conversion cannot reconstruct an answer the source no longer stores.</p>
    <div class="table-scroll"><table><caption>What the main source categories can contribute</caption><thead><tr><th>Source category</th><th>Frames</th><th>Timing</th><th>Layers</th><th>Best use</th></tr></thead><tbody>
      <tr><td>Supported Aseprite project</td><td>Supported timeline frames</td><td>Per-frame durations and supported tags</td><td>Supported normal raster layers</td><td>PNG sequence or spritesheet output</td></tr>
      <tr><td>PNG sequence</td><td>One per selected image</td><td>Starts at the converter default; editable later</td><td>One generated layer</td><td>Predictable frame-by-frame exports</td></tr>
      <tr><td>Grid spritesheet</td><td>One per equal cell</td><td>Starts at the converter default</td><td>One generated layer</td><td>Uniform game-export sheets</td></tr>
      <tr><td>PNG + supported JSON</td><td>From metadata rectangles</td><td>Supported per-frame durations and Aseprite frame tags</td><td>One generated layer</td><td>Trimmed or rotated atlases</td></tr>
      <tr><td>GIF / APNG</td><td>Decoded composited snapshots</td><td>Normalized source delays</td><td>One generated layer</td><td>Rendered web animations</td></tr>
      <tr><td>Supported project subset</td><td>Format-dependent</td><td>Format-dependent</td><td>Supported raster layers only</td><td>Keeping editable source structure</td></tr>
    </tbody></table></div>

    <h2>When layers matter</h2>
    <p>Choose the original project file before exporting a flat image. The current importers can preserve supported layer data from Aseprite, Pixilart 2.7, Piskel, Pixelorama, OpenRaster, Krita, and PSD inputs. That statement is intentionally conditional: groups, masks, effects, vector objects, tilemaps, non-normal blends, and other editor-specific features are often rejected because the internal model cannot represent them faithfully.</p>
    <p class="callout warning"><strong>Flat means flat.</strong> PNG, GIF, APNG, and spritesheet pixels cannot reveal whether a red pixel came from an “Ink” layer, a “Color” layer, or a flattened effect. The converter rebuilds a timeline; it does not claim to recover absent layers.</p>

    <h2>When timing matters</h2>
    <p>GIF and APNG carry per-frame delays, supported atlas JSON may carry durations, Piskel contributes one FPS-derived duration to every visible frame, Pixilart contributes each frame's millisecond <code>speed</code>, and Pixelorama combines its FPS with a frame duration multiplier. PNG sequence and grid modes start with a 100 ms default. All values are normalized to the internal whole-millisecond range of 1 through 65,535 before export.</p>

    <h2>A practical decision rule</h2>
    <ol class="steps"><li>If the original editor project opens and its format is supported, start there when layers matter.</li><li>If you only need visible animation and have separate frames, choose the PNG sequence.</li><li>If frames share one image, use grid mode only when every cell is equal and the grid covers the entire sheet exactly.</li><li>If a matching atlas JSON exists, prefer it for packed, trimmed, rotated, or individually timed frames.</li><li>If the source is GIF or APNG, expect a faithful supported compositing result on one layer, not the authoring structure.</li></ol>
    <p>After choosing a workflow, read its detailed guide and keep the original source until the downloaded output has been inspected in Aseprite or the matching image workflow. If selection or validation fails, continue with the <a href="/troubleshooting/">symptom-based troubleshooting guide</a>.</p>
  `,

  "/guides/aseprite-to-png-spritesheet/": `
    <p>An Aseprite project can contain an editable timeline, raster layers, positioned cels, timing, and frame tags. Sprite Converter reads a deliberately bounded part of that structure into the same <code>SpriteProject</code> model used by every other importer. You can then create a new Aseprite file, separate flattened PNG frames, or a row-major PNG spritesheet with JSON metadata. All parsing, decompression, compositing, encoding, and downloads stay in the browser tab.</p>

    <h2>What the current reader accepts</h2>
    <p>The reader accepts <code>.ase</code> and <code>.aseprite</code> files that use 32-bit RGBA pixels and direct normal raster layers. It validates the file header, every frame and chunk envelope, frame durations, layer records, cel references, compressed pixel lengths, and supported frame tags before returning a project. Layer names, back-to-front order, visibility, opacity, signed cel positions, frame timing, RGBA pixels, and forward, reverse, or ping-pong tags are mapped into the normalized model.</p>
    <p>File, canvas, frame, layer, cel, chunk, and decoded-byte limits are checked before large allocations. Compressed cels are inflated sequentially with a bounded expected output length. A corrupt compressed payload produces a content-safe error rather than exposing source bytes, local paths, or arbitrary decompressor details.</p>

    <h2>Why some Aseprite files are rejected</h2>
    <p>The current model does not represent every editor feature. Groups, nested layers, tilemaps, non-normal blend modes, background or reference layer semantics, per-cel opacity, custom cel z-index, ICC profiles, fixed gamma, slices, tilesets, external files, and non-empty user data are outside this subset. The reader rejects structures that cannot be mapped accurately instead of silently presenting them as preserved.</p>
    <p>The current reader accepts compressed image cels only. Raw and linked cels are rejected because linked editing relationships and the raw-cel variant are outside this first audited subset. Palette chunks in RGBA files are validated as metadata; palette identity is not part of the flattened PNG result.</p>

    <h2>PNG sequence output</h2>
    <p>PNG sequence output creates one deterministic PNG for each timeline frame. Visible layers are composited from bottom to top with normal source-over alpha, layer opacity, cel offsets, and clipping to the project canvas. Hidden layers and missing cels do not contribute. Names use a safe stem and a zero-padded frame number such as <code>walk-frame-0001.png</code>.</p>
    <p class="callout warning"><strong>PNG output is flattened.</strong> The frame image preserves rendered RGBA pixels, but it does not contain editable layer boundaries, layer names, frame duration, tags, linked-cel relationships, or other Aseprite editor metadata. Keep the original project when those properties matter.</p>

    <h2>Spritesheet PNG plus JSON output</h2>
    <p>The spritesheet exporter places flattened full-canvas frames left to right and then top to bottom. You can choose the column count; the row count follows from the frame count. Unused cells in the last row stay transparent. The JSON sidecar records each frame rectangle and duration, the sheet image name and size, and supported frame-tag names, ranges, and playback directions. The layout is compatible with the project's supported Aseprite-style spritesheet JSON importer.</p>
    <p>This path does not trim frames, rotate cells, pack irregular rectangles, or split a large result across multiple sheets. The exporter checks maximum dimensions and pixels before allocating the sheet. If a project would exceed the browser-local limit, reduce the canvas, frame count, or requested column layout in a copy of the source.</p>

    <h2>A practical verification workflow</h2>
    <ol class="steps"><li>Keep the original Aseprite project unchanged and work from a copy.</li><li>Choose <strong>Aseprite project</strong> in the converter and select exactly one <code>.ase</code> or <code>.aseprite</code> file.</li><li>Review the reported frame count, durations, layers, names, visibility, and preview before preparing output.</li><li>Choose Aseprite, PNG sequence, or Spritesheet PNG + JSON in the output selector. Give the files a short safe base name.</li><li>Use every generated download link. For a sheet, keep the PNG and JSON together.</li><li>Compare canvas size, frame order, transparency, offsets, timing metadata, and tags with the supported source properties before using the output in a production pipeline.</li></ol>
    <p>If import fails, do not rename extensions or delete arbitrary bytes. Save a simplified 32-bit RGBA copy in the original editor, remove unsupported structural features you understand, and try that copy. For other symptoms, use the <a href="/troubleshooting/">troubleshooting guide</a> or compare input categories in the <a href="/guides/">guide hub</a>.</p>
  `,

  "/guides/png-sequence-to-aseprite/": `
    <p>A PNG sequence represents an animation after each frame has already been rendered. The files preserve RGBA pixels and canvas dimensions. They do not preserve the source editor's layer stack, per-frame layer visibility, masks, blend modes, or project metadata.</p>

    <h2>How the importer maps files to frames</h2>
    <p>The importer processes the selected <code>File</code> objects in their supplied order. It verifies the PNG signature, decodes each image in the browser, and compares every decoded width and height with the first frame. It then creates one timeline frame and one full-canvas cel for each image.</p>
    <pre><code>SpriteProject
  canvas: width and height from the first PNG
  frames: selected files in supplied order, 100 ms each
  layer "Main": visible, opacity 255
  cels: one RGBA image at x=0, y=0 for every frame</code></pre>
    <p>The converter does not apply an extra filename sort inside the importer. Zero-padded names such as <code>spark-01.png</code>, <code>spark-02.png</code>, and <code>spark-10.png</code> make the browser's supplied order easier to inspect, but the selected-file list is the final source of truth.</p>

    <h2>Synthetic four-frame example</h2>
    <p>Imagine a 16×16 spark animation exported as <code>spark-01.png</code> through <code>spark-04.png</code>. Each PNG has a transparent 16×16 canvas; only the visible spark changes size. Selecting them in that order produces a 16×16 Aseprite document with four frames, one generated “Main” layer, and four cels positioned at the canvas origin.</p>
    <div class="mini-diagram">spark-01.png → frame 0 → Main cel at (0,0)
spark-02.png → frame 1 → Main cel at (0,0)
spark-03.png → frame 2 → Main cel at (0,0)
spark-04.png → frame 3 → Main cel at (0,0)</div>
    <p>If the first three files are 16×16 but the fourth is 15×16, conversion stops. Transparent padding is valid and usually preferable to scaling because padding keeps pixel art and alignment intact.</p>

    <h2>Prepare the sequence</h2>
    <ol class="steps"><li>Put only the intended animation frames in the selection. Exclude thumbnails, reference images, and alternate color variants.</li><li>Give every file the same canvas width and height. Align the subject by transparent canvas position, not by resizing individual visible shapes.</li><li>Use clear, zero-padded filenames and check the selected-file list before conversion.</li><li>Keep intentional blank frames; an all-transparent frame is still a valid timing frame.</li><li>Keep an untouched copy of the source folder until the Aseprite result is verified.</li></ol>

    <h2>Convert and verify</h2>
    <ol><li>On the <a href="/#converter">converter</a>, choose <strong>PNG sequence</strong>.</li><li>Select or drop one or more PNG files.</li><li>Review their displayed order and dimensions, then convert.</li><li>Use the timeline preview to check the first frame, last frame, motion, and transparency.</li><li>Download the file, open it in Aseprite, and adjust individual durations if the original workflow used non-uniform timing.</li></ol>
    <p>The default is 100 ms for every imported PNG. The page allows frame-duration editing after import; changing a duration updates the exported <code>SpriteProject</code> frame rather than changing any source file.</p>

    <h2>Common failure cases</h2>
    <h3>A file has a .png name but is not PNG data</h3><p>The importer checks the eight-byte PNG signature before decoding. Export a fresh PNG rather than renaming another image format.</p>
    <h3>Decoded dimensions do not match</h3><p>Use canvas resize or transparent padding in the source editor so every file matches the first frame. Do not stretch individual frames merely to satisfy the check.</p>
    <h3>Motion jumps backward</h3><p>Remove the files and select them again in the intended sequence. Check the order displayed by the converter; do not assume a later filename sort will repair it.</p>
    <h3>The output has only one layer</h3><p class="callout warning">That is the accurate result for flat PNG inputs. Use a supported project file containing layer data if separate source layers are essential.</p>
    <h3>A large sequence stalls or exhausts memory</h3><p>Decoded cost begins near <code>width × height × 4 × frame count</code>, before preview and export copies. Reduce canvas size, split long sequences, or close memory-heavy tabs. See <a href="/articles/browser-local-conversion/">how local processing uses memory</a>.</p>

    <h2>Choose another mode when needed</h2>
    <p>Use the <a href="/guides/spritesheet-to-aseprite/">spritesheet guide</a> when frames are packed in one PNG. Use GIF or APNG mode when the animated file itself carries timing. Use a supported project format when preserving supported layers is more important than working from flattened exports.</p>
  `,

  "/guides/spritesheet-to-aseprite/": `
    <p>A spritesheet stores multiple rendered frames in one image. This converter supports two deliberately different paths: an exact rectangular grid and a PNG paired with supported frame metadata. Choose based on how the sheet was packed, not merely on the file extension.</p>

    <h2>Exact grid slicing</h2>
    <p>Grid mode requires positive whole-number values for frame width, frame height, rows, and columns. The calculated grid must equal the image dimensions exactly:</p>
    <pre><code>frame width × columns = spritesheet width
frame height × rows = spritesheet height</code></pre>
    <p>For a synthetic 256×128 sheet with four columns and two rows, every frame is 64×64 and the output contains eight frames. A 257×128 version does not fit that grid because the extra horizontal pixel would be left over; the importer rejects it rather than cropping or guessing.</p>
    <div class="mini-diagram">256 px wide ÷ 4 columns = 64 px per frame
128 px high  ÷ 2 rows    = 64 px per frame
4 × 2 cells               = 8 timeline frames</div>

    <h2>Row-major and column-major order</h2>
    <p>Row-major order reads left to right across the first row, then continues on the next row. Column-major order reads top to bottom down the first column, then moves right. Both use the same pixels; only the mapping from cell position to frame index changes.</p>
    <div class="table-scroll"><table><caption>A 3-column by 2-row sheet</caption><thead><tr><th>Order</th><th>Frame positions</th></tr></thead><tbody><tr><td>Row-major</td><td>(row 0, col 0), (0,1), (0,2), (1,0), (1,1), (1,2)</td></tr><tr><td>Column-major</td><td>(row 0, col 0), (1,0), (0,1), (1,1), (0,2), (1,2)</td></tr></tbody></table></div>

    <h2>Padding and spacing are pixel data</h2>
    <p>Uniform transparent padding inside every cell is safe because it becomes part of each frame. Outer margins, separator lines, or uneven gaps are not automatically recognized. If those pixels make the grid dimensions fail, crop or repack the source. If they fit inside cells, they will appear in the generated cels.</p>
    <p class="callout warning">Grid mode has no setting for arbitrary per-frame rectangles. Do not force a trimmed or tightly packed atlas into an invented grid.</p>

    <h2>Metadata-driven atlas mode</h2>
    <p>PNG + JSON mode accepts a supported root-level <code>frames</code> array or object map. Each entry supplies an in-bounds rectangle and may supply a positive duration. Aseprite-style metadata can also preserve the supported frame-tag name, range, and direction fields.</p>
    <p>TexturePacker-style entries may use the supported 90-degree clockwise packing convention. When <code>trimmed</code> is true, complete and consistent <code>sourceSize</code> and <code>spriteSourceSize</code> data let the importer restore the pixels onto a transparent full-size frame. Incomplete placement data is rejected because guessing would introduce animation jitter.</p>
    <div class="table-scroll"><table><caption>Grid and JSON serve different source structures</caption><thead><tr><th>Question</th><th>Grid mode</th><th>PNG + JSON mode</th></tr></thead><tbody><tr><td>Frame boundaries</td><td>Equal cells from rows, columns, width, and height</td><td>One validated rectangle per metadata entry</td></tr><tr><td>Ordering</td><td>Row-major or column-major</td><td>Metadata array order or object entry order</td></tr><tr><td>Timing</td><td>100 ms default</td><td>Supported per-frame duration, otherwise default</td></tr><tr><td>Trimming</td><td>No automatic reconstruction</td><td>Restored only with complete supported placement metadata</td></tr><tr><td>Rotation</td><td>No</td><td>Supported documented convention</td></tr><tr><td>Original layers</td><td>Not present</td><td>Not present</td></tr></tbody></table></div>

    <h2>Practical workflow</h2>
    <ol class="steps"><li>Choose grid mode for one uniformly divided PNG, or PNG + JSON for an exporter-produced pair.</li><li>In grid mode, inspect the overlay and exact-fit status before converting.</li><li>In JSON mode, select the matching image and metadata together. Similar filenames do not prove they are a pair.</li><li>Verify output canvas size, frame count, order, transparency, and at least one edge or trimmed frame.</li><li>For JSON, also verify a short and long duration, a rotated frame if present, and frame tags if the metadata contains them.</li></ol>

    <h2>Why conversion fails</h2>
    <ul><li>The grid product does not equal the decoded image dimensions.</li><li>A frame rectangle is zero-sized, negative, fractional where an integer is required, or outside the PNG.</li><li>The JSON schema is nested or otherwise outside the supported atlas families.</li><li>Trimmed placement metadata is missing or inconsistent across frames.</li><li>Rotation or tag metadata contains an unsupported value.</li><li>The JSON belongs to another image.</li></ul>
    <p>If every frame is available separately, a <a href="/guides/png-sequence-to-aseprite/">PNG sequence</a> is the simplest fallback. For ambiguous validation, consult <a href="/troubleshooting/">troubleshooting</a> rather than deleting metadata fields at random.</p>
  `,

  "/guides/pixilart-to-aseprite/": `
    <p>This importer is based on engineering work performed against an observed genuine Pixilart 2.7.0 saved-project structure. It is not a claim that every Pixilart version, feature, or historical file is compatible. The committed fixtures reproduce only the verified container shape with freshly generated 2×2 test pixels; no user's file or embedded artwork is part of the repository.</p>

    <h2>Why the importer had to change</h2>
    <p>An earlier implementation used a repository-defined synthetic object shaped like <code>{ pixil: { schemaVersion: 1, ... } }</code>. Compatibility testing with a genuine 2.7 save showed that this model was not the application's actual file contract. It failed on the real top-level <code>application</code> field before reaching pixels.</p>
    <p>Task 103 replaced that fixture-only assumption with a conservative parser for the observed structure. The old synthetic schema is now intentionally rejected with a migration diagnostic instead of being mistaken for a real Pixilart project.</p>

    <h2>The accepted 2.7 container</h2>
    <pre><code>{
  "application": "pixil",
  "type": ".pixil",
  "version": "2.7.0",
  "website": "pixilart.com",
  "width": "2",
  "height": "2",
  "frames": [
    { "width": "2", "height": "2", "speed": 120, "layers": [...] }
  ]
}</code></pre>
    <p>Canvas dimensions may be safe integers or canonical non-negative integer strings. Each frame must repeat those dimensions, provide a positive integer <code>speed</code> in milliseconds, and contain a non-empty layer array. The implementation accepts version <code>2.7.0</code> only.</p>

    <h2>Per-frame layers and embedded PNGs</h2>
    <p>Each observed layer record has a non-empty name, opacity from 0 through 1, <code>options.blend: "source-over"</code>, stable identity, and an embedded PNG payload in <code>src</code>. The parser finds the <code>base64,</code> marker, strictly decodes what follows, verifies the PNG signature, then uses browser image decoding to obtain full-canvas RGBA pixels.</p>
    <p>The layer payload for every frame is a complete canvas-sized PNG, not a raw RGBA array and not a remote URL. Decoded dimensions must match the project canvas exactly.</p>

    <h2>Reconstructing logical layers across frames</h2>
    <p>Pixilart repeats layers inside every frame. Aseprite and <code>SpriteProject</code> instead describe a logical layer once and attach cels to it over time. The importer joins repeated records using a non-empty <code>unqid</code> when available. If it is absent, a validated non-negative numeric <code>id</code> is the only fallback.</p>
    <div class="mini-diagram">frame 0: Ink(unqid A) + Color(unqid B)
frame 1: Ink(unqid A) + Color(unqid B)
                       ↓ identity join
SpriteProject layer Ink:   cel(frame 0), cel(frame 1)
SpriteProject layer Color: cel(frame 0), cel(frame 1)</div>
    <p>Names, opacity, identity, and order must remain consistent across frames. A missing, duplicated, reordered, or conflicting logical layer is rejected rather than merged by position. Each resulting cel is placed at <code>(0, 0)</code>.</p>

    <h2>What the conversion preserves</h2>
    <ul><li>Canvas width and height within the documented limits.</li><li>Frame-array order.</li><li>Each frame's positive millisecond <code>speed</code>, normalized to 1–65,535 ms.</li><li>Supported layer names, order, opacity, and full-canvas RGBA pixels.</li><li>Normal source-over behavior, represented by normal Aseprite layers.</li></ul>
    <p>Opacity is converted to the 0–255 integer range. Layer IDs in the output are deterministic converter IDs; the source identity is used to reconstruct layers, not advertised as preserved editor metadata.</p>

    <h2>What remains uncertain or unsupported</h2>
    <p>The optional <code>active</code> boolean is type-checked but not mapped to visibility because its editor-state meaning was not established. Imported layers remain visible. Palettes, previews, selection state, locks, filters, frame names, contact fields, effects, groups, external data, non-PNG payloads, and non-normal blend modes are not preserved.</p>
    <p class="callout warning">A different Pixilart version or a valid 2.7 file using unobserved metadata may be rejected. Strict rejection is a compatibility safeguard, not evidence that the source is corrupt.</p>

    <h2>Validation and privacy boundaries</h2>
    <p>The parser limits dimensions to 1–1024, frames to 512, layers per frame to 64, cels to 4,096, and both embedded PNG bytes and decoded cel allocation to documented totals. Malformed base64, non-PNG data, mismatched dimensions, ambiguous identity, and unsupported blends produce content-safe diagnostics without echoing source JSON or embedded pixels.</p>

    <h2>How to verify a conversion</h2>
    <ol class="steps"><li>Keep the genuine file outside the repository and choose <strong>Pixil/Pixilart project</strong> in the converter.</li><li>Compare canvas size and frame timing with the source project.</li><li>Check layer count, order, names, opacity, and representative pixels on at least two frames.</li><li>Confirm layers expected to be visible remain visible; do not interpret Pixilart's <code>active</code> state as visibility.</li><li>Keep the original file because the output intentionally omits uncertain editor metadata.</li></ol>
    <p>For the underlying layer/cel relationship, read <a href="/articles/aseprite-frames-layers-cels/">Frames, layers, and cels explained</a>. If the file is rejected, use <a href="/troubleshooting/">project-file troubleshooting</a> and report only a newly created minimal reproduction that is safe to disclose.</p>
  `,

  "/guides/piskel-to-aseprite/": `
    <p>A <code>.piskel</code> project can carry editable information that a GIF or PNG export has already flattened. The importer accepts a documented model-version-2 JSON subset and maps its supported layers and visible frames into <code>SpriteProject</code>.</p>

    <h2>Project file versus rendered export</h2>
    <p>The project contains a global canvas size, FPS, a list of layer records, chunk layouts, and embedded PNG sheets. A rendered PNG contains only one composited frame; a rendered GIF contains composited animation frames. Choose the project file when layer names, order, opacity, or visibility matter.</p>
    <pre><code>{
  "modelVersion": 2,
  "piskel": {
    "name": "Synthetic walk",
    "fps": 12,
    "width": 16,
    "height": 16,
    "layers": ["{...string-encoded layer JSON...}"],
    "hiddenFrames": []
  }
}</code></pre>

    <h2>How chunks become cels</h2>
    <p>Every layer entry is itself a JSON string. Its <code>chunks</code> contain rectangular <code>layout[column][row]</code> arrays and exact <code>data:image/png;base64,</code> images. Layout cells identify zero-based frame indexes. Across all chunks in one layer, every frame index must appear exactly once—no gaps, duplicates, negative values, or ragged columns.</p>
    <p>After local PNG decoding, the sheet dimensions must equal the project frame size multiplied by the chunk layout. The importer slices each cell into a full-canvas RGBA cel at <code>(0, 0)</code>. The supported legacy form with one top-level <code>base64PNG</code> is normalized as a horizontal sheet, but a layer containing both legacy and chunk forms is rejected as ambiguous.</p>

    <h2>Layers and hidden frames</h2>
    <p>Layer array order is preserved. Names are required, opacity defaults to 1 and maps to 0–255, and an explicit boolean visibility value is preserved. Generated IDs such as <code>piskel-layer-0</code> provide stable internal identity; source layers are not merged or synthesized.</p>
    <p>Supported <code>hiddenFrames</code> indexes are omitted from every layer, and remaining frames are reindexed contiguously. The importer accepts the known empty-string sentinels written by some Piskel exports but rejects ambiguous non-empty strings, duplicate indexes, out-of-range indexes, or a project in which every frame is hidden.</p>

    <h2>Timing behavior</h2>
    <p>This subset uses one finite positive FPS value for the whole project. It does not accept arbitrary per-frame durations. Every visible output frame receives:</p>
    <pre><code>durationMs = clamp(round(1000 / fps), 1, 65535)</code></pre>
    <p>For example, 12 FPS becomes approximately 83 ms per frame after whole-millisecond rounding. Project name and description are validated metadata but are not represented in the generated Aseprite file.</p>

    <h2>Compatibility is intentionally narrow</h2>
    <p>The importer rejects unsupported model versions, unknown fields outside the documented harmless <code>expanded</code> state, invalid layer JSON, inconsistent frame counts, external image URLs, malformed PNG data, incomplete frame coverage, or decoded sheet-size mismatches. This prevents a plausible-looking output from silently omitting source structure.</p>
    <div class="table-scroll"><table><caption>Expected output from the supported subset</caption><thead><tr><th>Piskel input</th><th>Aseprite output</th></tr></thead><tbody><tr><td>Canvas width and height</td><td>RGBA document canvas</td></tr><tr><td>Visible frame indexes</td><td>Contiguous timeline frames</td></tr><tr><td>Global FPS</td><td>Same normalized duration on every frame</td></tr><tr><td>Layer array</td><td>Same order, names, opacity, and supported visibility</td></tr><tr><td>Chunk frame pixels</td><td>Full-canvas cels on the matching layer</td></tr><tr><td>Project name and description</td><td>Not exported</td></tr></tbody></table></div>

    <h2>Prepare and verify</h2>
    <ol class="steps"><li>Save a fresh model-version-2 project rather than renaming a flattened export.</li><li>Check that important frames are not marked hidden and that every layer covers the same timeline.</li><li>Convert with <strong>Piskel project</strong> mode and inspect the preview.</li><li>In Aseprite, compare timing, visible frame count, layer order, names, opacity, transparency, and representative pixels.</li><li>Keep the Piskel original; the conversion is editable but not a universal round trip.</li></ol>
    <p>Compare with the <a href="/guides/pixilart-to-aseprite/">Pixilart guide</a> only when you actually have a Pixilart file—the two JSON containers and layer reconstruction rules are substantially different.</p>
  `,

  "/guides/gif-apng-to-aseprite/": `
    <p>GIF and APNG are animated rendered formats. They describe how full or partial pixel rectangles appear over time, including timing and compositing instructions. They do not contain the original editor layers used to author those rendered frames.</p>

    <h2>The shared output model</h2>
    <p>Both importers produce a full-canvas RGBA snapshot for every accepted animation frame. The snapshots become cels on one generated layer named “Main.” Offsets, transparency, blending, and disposal are resolved during decoding so the Aseprite timeline shows the displayed result for each moment.</p>
    <p class="callout">Disposal affects the working canvas prepared for the next frame. It does not erase the snapshot already saved for the current frame.</p>

    <h2>GIF-specific behavior</h2>
    <p>The project owns a deterministic GIF89a block parser, LZW decoder, and compositor. It does not depend on timer-driven browser image capture. The supported subset allows global or local color tables, non-interlaced image rectangles, transparency, and disposal methods 0 through 3. The first image must cover the full logical screen; later frames may be smaller and offset.</p>
    <p>GIF delay units are hundredths of a second. A missing or zero delay becomes 100 ms. Positive values are multiplied by 10 and clamped to 20–65,535 ms. Identical frames remain separate; loop metadata is validated but not copied because <code>SpriteProject</code> has no loop-count field.</p>
    <ul><li>Disposal 0 or 1 keeps the canvas for the next frame.</li><li>Disposal 2 clears the current rectangle to transparency or the validated logical-screen background, depending on the control data.</li><li>Disposal 3 restores the pre-draw canvas.</li><li>Reserved disposal values, interlacing, user-input timing, plain-text extensions, malformed LZW streams, and ambiguous bounds are rejected.</li></ul>

    <h2>APNG-specific behavior</h2>
    <p>The APNG path validates PNG chunks, CRCs, sequence numbers, frame bounds, and a deliberately narrow RGBA8 non-interlaced structure. The first frame must be the default image and cover the canvas. Later frame rectangles can be offset. The importer reverses PNG filters, inflates bounded frame data locally, and applies APNG source or over blending with straight-alpha math.</p>
    <p>APNG delays use <code>delay_num / delay_den</code> seconds; a zero denominator means 100. Values are rounded to the nearest millisecond and clamped to 1–65,535 ms. Disposal may keep the result, clear the rectangle to transparent, or restore its exact pre-draw contents. A static PNG without animation control is rejected in APNG mode so frames are never silently discarded.</p>

    <div class="table-scroll"><table><caption>Important differences in the implemented subsets</caption><thead><tr><th>Behavior</th><th>GIF</th><th>APNG</th></tr></thead><tbody><tr><td>Color representation</td><td>Indexed palettes decoded to RGBA</td><td>RGBA8 pixels in the accepted subset</td></tr><tr><td>Timing normalization</td><td>Hundredths; zero → 100 ms; positive floor 20 ms</td><td>Fractional numerator/denominator; minimum 1 ms</td></tr><tr><td>Compositing</td><td>Transparent indexes and palette replacement</td><td>Source replacement or straight-alpha source-over</td></tr><tr><td>Disposal</td><td>Keep, background/transparent clear, previous</td><td>None, transparent background clear, previous</td></tr><tr><td>Loop count</td><td>Validated, not exported</td><td>Validated, not exported</td></tr><tr><td>Original layers</td><td>Unavailable</td><td>Unavailable</td></tr></tbody></table></div>

    <h2>Which input should you prefer?</h2>
    <p>Use the original project file when you need supported layer structure. Use a <a href="/guides/png-sequence-to-aseprite/">PNG sequence</a> when you have clean full-frame exports and want the simplest, most predictable source. Use GIF or APNG when its embedded timing and compositing are the information you need to retain.</p>

    <h2>Verification checklist</h2>
    <ol class="steps"><li>Compare frame count and the first and last snapshots.</li><li>Check a frame with transparency and a frame drawn at an offset.</li><li>Check motion immediately after a disposal operation; errors often appear one frame later.</li><li>Compare both a short and long frame delay.</li><li>Expect one generated layer and do not infer missing authoring layers from the rendered pixels.</li></ol>
    <p>When the animation is rejected, the file may be valid but outside the documented subset. The <a href="/troubleshooting/">troubleshooting guide</a> explains how to distinguish that case from corruption or browser limits.</p>
  `,

  "/guides/project-files-to-aseprite/": `
    <p>PSD, Krita, OpenRaster, and Pixelorama can all contain raster layers, but their supported paths are not interchangeable. This project chooses small, test-backed subsets and rejects source features that cannot be represented honestly in <code>SpriteProject</code>.</p>

    <h2>Comparison at a glance</h2>
    <div class="table-scroll"><table><caption>Implemented raster project subsets</caption><thead><tr><th>Format</th><th>Frames</th><th>Preserved raster data</th><th>Key rejections</th></tr></thead><tbody>
      <tr><td>PSD</td><td>One frame at 100 ms</td><td>Root raster layers, order, names, visibility, opacity, offsets, RGBA pixels</td><td>PSB, non-RGB/8-bit, groups, text, smart objects, adjustments, masks, effects, clipping, non-normal blends, animation</td></tr>
      <tr><td>Krita .kra</td><td>One frame at 100 ms</td><td>Supported paint layers, order, names, visibility, 0–255 opacity, signed offsets, RGBA pixels</td><td>Vector layers, nested groups, masks, animation/keyframes, unsupported color depth or tile encoding, preview-only files</td></tr>
      <tr><td>OpenRaster .ora</td><td>One frame at 100 ms</td><td>PNG-backed raster layers, order, names, visibility, opacity, signed offsets</td><td>Nested stacks, masks, effects, animation metadata, non-source-over composite operations</td></tr>
      <tr><td>Pixelorama .pxo</td><td>Multiple supported frames</td><td>Pixel layers, order, names, visibility, opacity, full-canvas RGBA cels, FPS-derived durations</td><td>Tilemaps, effects, groups, 3D/audio, non-normal blends, per-cel opacity or z-index, ambiguous metadata</td></tr>
    </tbody></table></div>

    <h2>PSD: direct RGB raster layers</h2>
    <p>The PSD importer accepts the ordinary PSD signature and version 1, RGB color mode, eight bits per channel, supported raw or PackBits channel data, and direct raster layers. Layer rectangles may occupy only part of the document; their signed canvas position becomes the cel offset. The exporter retains layer opacity separately from per-pixel alpha and does not pre-composite layers.</p>
    <p>Visible groups and editor objects are rejected rather than flattened into misleading “preserved” layers. A flattened composite is not used as a fallback. PSD animation and layer-name conventions that merely imply frames are also unsupported.</p>

    <h2>Krita: native paint-layer data, not the preview</h2>
    <p>The <code>.kra</code> reader validates the ZIP container and Krita document XML, then decodes supported native paint-layer tile data. It requires the documented 8-bit RGBA subset, ordinary paint layers, normal compositing, and one frame. <code>preview.png</code> and <code>mergedimage.png</code> may exist, but they are never used to claim layer preservation. A preview-only archive is rejected because it lacks supported native layer data.</p>

    <h2>OpenRaster: a simple portable layer stack</h2>
    <p>OpenRaster stores a <code>stack.xml</code> plus PNG layer images. The importer accepts one root stack of ordinary PNG-backed layers, preserving source order, names, visibility, opacity, and signed positions. It validates safe archive paths, the required mimetype, ZIP metadata, XML structure, and referenced image dimensions. Nested stacks and composite operations other than supported source-over are outside the subset.</p>

    <h2>Pixelorama: the layered animation option</h2>
    <p>The Pixelorama subset is the only format on this comparison page that currently rebuilds multiple frames. Its <code>data.json</code> defines canvas size, FPS, layers, and frames, while ZIP entries such as <code>image_data/frames/1/layer_1</code> carry raw full-canvas pixels. Every frame must have exactly one supported cel record per layer.</p>
    <p>Frame duration is a multiplier combined with FPS:</p>
    <pre><code>durationMs = clamp(round((frame.duration × 1000) / fps), 1, 65535)</code></pre>
    <p>Normal pixel layers are supported. Per-cel opacity must be 1 and z-index 0 because the canonical model does not contain either field.</p>

    <h2>Why normal blend mode is a boundary</h2>
    <p>The Aseprite writer currently creates normal raster layers. Silently accepting multiply, erase, adjustment, or application-specific effects would change the displayed pixels or imply editability the output does not have. Each importer therefore rejects unsupported blend behavior before export. If the visual result matters more than editable layers, make a separate flattened copy in the source editor and convert that copy as frames.</p>

    <h2>Preparation workflow</h2>
    <ol class="steps"><li>Keep the original project and create a simplified copy.</li><li>Remove or rasterize unsupported editor objects only when doing so is acceptable for your workflow.</li><li>Use normal blend behavior and ordinary raster/pixel/paint layers.</li><li>For PSD, Krita, and OpenRaster, expect one output frame. Use Pixelorama only when its supported project subset carries the animation.</li><li>Verify layer order, names, visibility, opacity, offsets, transparency, and pixels in Aseprite before discarding anything.</li></ol>
    <p class="callout warning">“Project file” does not mean “lossless.” Support is a mapping of specific verified structures, not an endorsement of universal compatibility with the source editor.</p>
  `,

  "/compatibility-lab/": `
    <p>This lab turns compatibility claims into repeatable checks. Every downloadable file below is tiny, original test artwork generated inside the public repository. None of it contains user artwork or a third-party asset. You can inspect the generator, download the exact input, run it through the production converter, and compare the resulting project with the observations recorded here.</p>
    <p class="callout success"><strong>Evidence boundary:</strong> a passing fixture demonstrates the documented structure represented by that fixture. It does not prove universal compatibility with every file made by the same editor.</p>

    <h2>Start with the two-frame spark</h2>
    <div class="sample-gallery" aria-label="Synthetic PNG sequence and spritesheet samples">
      <figure class="sample-card">
        <img src="/samples/spark-01.png" width="160" height="160" alt="Enlarged four by four synthetic coral and yellow spark frame">
        <figcaption><strong>Frame 1</strong><span>4×4 RGBA PNG · flat pixels</span><a href="/samples/spark-01.png" download>Download spark-01.png</a></figcaption>
      </figure>
      <figure class="sample-card">
        <img src="/samples/spark-02.png" width="160" height="160" alt="Enlarged four by four synthetic cyan and yellow spark frame shifted right">
        <figcaption><strong>Frame 2</strong><span>4×4 RGBA PNG · flat pixels</span><a href="/samples/spark-02.png" download>Download spark-02.png</a></figcaption>
      </figure>
      <figure class="sample-card sample-card-wide">
        <img src="/samples/spark-sheet.png" width="320" height="160" alt="Enlarged eight by four spritesheet containing the coral and cyan spark frames">
        <figcaption><strong>Horizontal sheet</strong><span>8×4 RGBA PNG · two 4×4 cells</span><a href="/samples/spark-sheet.png" download>Download spark-sheet.png</a></figcaption>
      </figure>
    </div>

    <h3>Repeat the PNG sequence check</h3>
    <ol class="steps"><li>Download both 4×4 PNG frames above.</li><li>Open the <a href="/">converter</a>, click <strong>PNG frames</strong> and then <strong>Aseprite</strong> on the conversion route map, and add the two files in frame order.</li><li>Follow the directed route to start conversion, then inspect the local preview before downloading the generated Aseprite file.</li><li>Open the result in Aseprite and compare the canvas, frame count, layer count, order, transparency, and representative pixels.</li></ol>
    <div class="table-scroll"><table><caption>Observed PNG sequence result</caption><thead><tr><th>Check</th><th>Expected observation</th><th>Why</th></tr></thead><tbody><tr><td>Canvas</td><td>4×4 RGBA</td><td>Both inputs have the same decoded dimensions.</td></tr><tr><td>Timeline</td><td>2 ordered frames</td><td>Each PNG becomes one frame in supplied order.</td></tr><tr><td>Timing</td><td>100 ms per frame</td><td>The sequence importer uses its documented default duration.</td></tr><tr><td>Layers</td><td>1 generated layer</td><td>PNG stores composited pixels, not original editor-layer records.</td></tr><tr><td>Transparency</td><td>Unused pixels remain transparent</td><td>RGBA pixel alpha is carried into each cel.</td></tr></tbody></table></div>

    <h3>Repeat the atlas metadata check</h3>
    <p>Use the same pixels as an atlas by downloading <a href="/samples/spark-sheet.png" download>spark-sheet.png</a> and <a href="/samples/spark-sheet.json" download>spark-sheet.json</a>. Choose <strong>Spritesheet PNG + JSON</strong> and add both files. The JSON names two rectangles: <code>(0,0,4,4)</code> and <code>(4,0,4,4)</code>. The observed result is a 4×4, two-frame, one-layer timeline with durations of 80 ms and 120 ms. The metadata changes timing and slicing; it still does not create source layers that are absent from the flat sheet.</p>
    <details class="evidence-details"><summary>Read the exact atlas metadata</summary><pre><code>{
  "frames": [
    { "frame": { "x": 0, "y": 0, "w": 4, "h": 4 }, "duration": 80 },
    { "frame": { "x": 4, "y": 0, "w": 4, "h": 4 }, "duration": 120 }
  ],
  "meta": { "image": "spark-sheet.png", "size": { "w": 8, "h": 4 } }
}</code></pre></details>

    <h2>Layered project checks</h2>
    <p>Flat images test frame reconstruction. Project files test a different claim: preserving supported layers when the source actually contains layer records. These files are deliberately tiny so their structure and output can be inspected without relying on private artwork.</p>
    <div class="table-scroll"><table><caption>Downloadable positive project fixtures and observed normalized results</caption><thead><tr><th>Input</th><th>Observed SpriteProject</th><th>Preservation evidence</th></tr></thead><tbody>
      <tr><td><a href="/samples/multi-layer.piskel" download>multi-layer.piskel</a></td><td>2×2 · 2 frames at 50 ms · 2 layers</td><td><code>Background</code> and <code>Accent</code> layer records, with source opacities 0.5 and 1, map to separate Aseprite layers.</td></tr>
      <tr><td><a href="/samples/two-layers-two-frames.pixil" download>two-layers-two-frames.pixil</a></td><td>2×2 · 2 frames at 120/75 ms · 2 layers</td><td>Stable layer identities and full-canvas embedded PNG cels are reconstructed across both frames.</td></tr>
      <tr><td><a href="/samples/two-layers-two-frames.pxo" download>two-layers-two-frames.pxo</a></td><td>2×2 · 2 frames at 100/250 ms · 2 layers</td><td>Names, order, visibility, opacity, frame duration multipliers, and raw RGBA cel payloads are mapped.</td></tr>
      <tr><td><a href="/samples/two-layers.ora" download>two-layers.ora</a></td><td>4×3 · 1 frame at 100 ms · 2 layers</td><td>Names, order, visibility, opacity, signed offsets, and PNG-backed raster pixels remain distinct.</td></tr>
      <tr><td><a href="/samples/two-paint-layers.kra" download>two-paint-layers.kra</a></td><td>2×2 · 1 frame at 100 ms · 2 layers</td><td>Supported Krita paint-device tiles decode from native BGRA bytes; flattened previews are not used to invent layers.</td></tr>
      <tr><td><a href="/samples/two-layers.psd" download>two-layers.psd</a></td><td>4×3 · 1 frame at 100 ms · 2 layers</td><td>The narrow RGB 8-bit subset maps raster layer names, order, visibility, opacity, and decoded RGBA pixels.</td></tr>
    </tbody></table></div>
    <p>To repeat one of these checks, download the fixture, choose its matching project mode, convert, and inspect the preview plus the downloaded file. A normal raster layer result is evidence of source layer data being mapped. It is not evidence that groups, vectors, masks, effects, text, smart objects, tilemaps, or non-normal blends were preserved.</p>

    <h2>Animation timing and compositing checks</h2>
    <div class="sample-gallery sample-gallery-two">
      <figure class="sample-card">
        <img src="/samples/timing-transparency-offsets.gif" width="240" height="160" alt="Enlarged synthetic GIF used to test timing transparency and partial frame offsets">
        <figcaption><strong>GIF timing fixture</strong><span>3×2 · 4 composited frames</span><a href="/samples/timing-transparency-offsets.gif" download>Download GIF</a></figcaption>
      </figure>
      <figure class="sample-card">
        <img src="/samples/timing-offsets.apng" width="240" height="160" alt="Enlarged synthetic APNG used to test timing and partial frame offsets">
        <figcaption><strong>APNG timing fixture</strong><span>3×2 · 4 composited frames</span><a href="/samples/timing-offsets.apng" download>Download APNG</a></figcaption>
      </figure>
    </div>
    <p>The GIF fixture exercises transparency, partial rectangles, and delay normalization. Its observed durations are 100, 20, 120, and 65,535 ms. The APNG fixture exercises partial rectangles and rational delay normalization; its observed durations are 1, 17, 10, and 65,535 ms. Both formats produce one generated flat layer because animation frames do not contain the original editor's layer stack.</p>

    <h2>What the tests intentionally reject</h2>
    <p>A credible compatibility boundary includes failures. The automated suite does not silently accept a file merely because its extension looks familiar. Representative rejection checks include:</p>
    <ul><li>PNG sequence frames with mismatched decoded dimensions.</li><li>A grid whose cell products do not exactly fit its spritesheet.</li><li>Atlas rectangles outside the source image, incomplete trim data, unsupported rotation values or conventions, and invalid durations.</li><li>Malformed JSON, invalid PNG signatures, unsafe ZIP paths, missing archive entries, and resource limits.</li><li>External Pixil image URLs, unsupported model versions, ambiguous layer identity, and missing cels.</li><li>Project groups, tilemaps, effects, masks, vector or text objects, unsupported color modes, and non-normal blend behavior outside the documented subset.</li><li>Flattened previews offered in place of actual layer payloads.</li></ul>
    <p>Failing closed protects the meaning of the output. It is better to explain that a structure is unsupported than to return a file labeled editable after silently discarding data.</p>

    <h2>Inspect and reproduce the evidence</h2>
    <p>The public samples are copied byte-for-byte from the repository's deterministic fixtures. Their generator can reproduce them locally, and automated tests assert that the published copies have not drifted from the inputs used by the importers. Start with the <a href="https://github.com/khs2325/sprite-converter/blob/main/tests/fixtures/README.md">fixture inventory and provenance notes</a>, inspect the <a href="https://github.com/khs2325/sprite-converter/blob/main/tests/fixtures/generate.mjs">deterministic generator</a>, and follow the <a href="https://github.com/khs2325/sprite-converter/blob/main/src/core/conversion.integration.test.ts">end-to-end conversion assertions</a>. The <a href="https://github.com/khs2325/sprite-converter/blob/main/src/core/exporters/aseprite/aseprite.test.ts">Aseprite writer tests</a> cover binary structure and validation.</p>
    <p>Maintainer: <a href="https://github.com/khs2325">khs2325</a>. Corrections and reproducible compatibility reports belong in the <a href="https://github.com/khs2325/sprite-converter/issues">public issue tracker</a>; use newly created synthetic artwork rather than private source files.</p>
  `,

  "/articles/": `
    <p>The converter is small enough to use without understanding its internals, but its decisions make more sense once pixels, cels, timelines, validation, and browser-local processing are separated. These articles document the implementation rather than paraphrasing a generic conversion service.</p>
    <div class="card-grid">
      <a class="link-card" href="/articles/aseprite-frames-layers-cels/"><strong>Frames, layers, and cels</strong><span>See how the canonical SpriteProject model represents canvas, time, stack order, positions, opacity, and RGBA data.</span></a>
      <a class="link-card" href="/articles/browser-local-conversion/"><strong>Browser-local conversion pipeline</strong><span>Follow selected files through local parsing, validation, preview, binary export, and a browser-generated download.</span></a>
      <a class="link-card" href="/articles/verify-sprite-conversion/"><strong>Verify a conversion</strong><span>Use a repeatable acceptance test for canvas, frames, timing, transparency, layers, cels, and downloaded output.</span></a>
    </div>
    <h2>Why these topics belong together</h2>
    <p>Privacy, compatibility, and verification share one architectural boundary: every importer must turn its source into the same <code>SpriteProject</code> without sending artwork away. Once that model is valid, the Aseprite writer no longer needs to know whether pixels came from PNG, GIF, a ZIP-based project, or PSD channels. A useful acceptance test then checks the same normalized facts regardless of source format.</p>
    <p>The model also explains why flat images cannot yield layers. A rendered PNG supplies one pixel result; it does not supply the missing relationships between logical layers and cels. Read the data-model article first when a preservation claim is unclear, and the browser article when a network or memory question is unclear.</p>
    <h2>Apply the model to a real conversion</h2>
    <p>Open the <a href="/compatibility-lab/">compatibility lab</a> to download the exact synthetic PNG, atlas, project, GIF, and APNG inputs used by the test suite. Each experiment records observed canvas, frame, timing, and layer values and links back to its public generator and assertions.</p>
    <p>Return to the <a href="/guides/">guide hub</a> to choose an input format, or open <a href="/troubleshooting/">troubleshooting</a> when validation has already stopped a conversion.</p>
  `,

  "/articles/aseprite-frames-layers-cels/": `
    <p>A sprite editor project has more than an image. It has a canvas, a timeline, a vertical layer stack, and pieces of pixel data placed where a particular frame and layer intersect. This repository calls that intersection a cel and carries it through the canonical <code>SpriteProject</code> model.</p>

    <h2>The model used by every importer</h2>
    <pre><code>type SpriteProject = {
  width: number;
  height: number;
  colorMode: "rgba";
  frames: { index: number; durationMs: number }[];
  layers: {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    cels: {
      frameIndex: number;
      x: number;
      y: number;
      imageData: ImageData;
    }[];
  }[];
}</code></pre>
    <p>Optional frame tags add a name, inclusive range, and forward, reverse, or ping-pong direction. The model currently uses RGBA pixels and whole-millisecond frame durations from 1 through 65,535.</p>

    <h2>Canvas: the shared coordinate space</h2>
    <p><code>width</code> and <code>height</code> define the document canvas. A cel can be smaller than that canvas and use signed <code>x</code> and <code>y</code> coordinates, which is useful for a PSD or OpenRaster layer whose pixels occupy only part of the document. Full-frame inputs such as PNG sequences normally create canvas-sized cels at <code>(0, 0)</code>.</p>

    <h2>Frames: time without pixels</h2>
    <p>A frame record identifies one timeline position and how long it displays. It does not own an image directly. Frame indexes must be contiguous and match their array positions. This separation lets many layers contribute different cels to the same moment.</p>
    <p>A three-frame project might use 80 ms, 120 ms, and 200 ms. GIF, APNG, atlas JSON, Pixilart, Piskel, and Pixelorama derive those values differently, but the Aseprite exporter consumes the normalized result in exactly one form.</p>

    <h2>Layers: stack-wide properties</h2>
    <p>A layer has stable identity, a display name, visibility, opacity from 0 to 255, and an ordered list of cels. Array order becomes Aseprite layer order. Opacity remains a layer property; the exporter does not bake it into every pixel.</p>
    <p>The current writer emits normal raster layers. That is why importers reject source blends and editor objects whose behavior cannot be represented as a normal layer without changing meaning.</p>

    <h2>Cels: where layer and frame meet</h2>
    <div class="mini-diagram">                frame 0        frame 1        frame 2
Ink layer       Ink cel 0       Ink cel 1       Ink cel 2
Color layer     Color cel 0     Color cel 1     Color cel 2</div>
    <p>Each cel points to one frame index and carries its own RGBA <code>ImageData</code> plus an x/y position. One layer may have no cel for a frame; another may have one. Validation forbids two cels from the same layer claiming the same frame because that would be ambiguous.</p>

    <h2>A synthetic two-layer example</h2>
    <p>Consider a 16×16 two-frame character. “Color” is the lower layer and “Ink” is above it. Each layer has a cel on each frame, for four cels total. Both frames last 100 ms. Aseprite can now hide Ink, rename Color, or edit one frame's ink without changing the other three cels.</p>
    <p>If the same animation is exported to two flattened PNG files, each PNG contains only the final composited pixels. The converter can still create two frames, but it has no evidence that Ink and Color ever existed. The accurate output is one generated layer with two cels.</p>

    <h2>How the binary writer uses the model</h2>
    <p>The exporter validates canvas size, frame count, duration, layer properties, cel bounds, unique frame references, RGBA byte length, and optional tags. It writes a 32-bit RGBA Aseprite header, layer chunks in the first frame, compressed-image cel chunks in their referenced frames, and a frame-tags chunk when present.</p>
    <p>Cel opacity is written as fully opaque because <code>SpriteProject</code> has no per-cel opacity; layer opacity remains separate. Cel coordinates must fit Aseprite's signed 16-bit fields. Pixel bytes are stored in a zlib stream using deterministic uncompressed DEFLATE blocks.</p>

    <h2>Use the distinctions when judging compatibility</h2>
    <ul><li>“Converts frames” means timeline positions and displayed pixels can be rebuilt.</li><li>“Preserves layers” means the source contains layer records and the specific importer maps their supported properties.</li><li>“Preserves cels” means layer-specific pixels and frame references survive the mapping.</li><li>“Looks the same” is not proof that masks, effects, blend modes, or editor metadata remain editable.</li></ul>
    <p>Continue with <a href="/articles/browser-local-conversion/">the browser-local pipeline</a> to see how source-specific parsers converge on this model.</p>
  `,

  "/articles/browser-local-conversion/": `
    <p>Browser-local conversion means source artwork is read, parsed, decoded, transformed, previewed, and exported by code running in the browser tab. It does not mean the page makes no network requests at all: Cloudflare still serves the public HTML, CSS, JavaScript, and other static assets needed to load the application.</p>

    <h2>The conversion pipeline</h2>
    <ol class="steps"><li>The visitor selects files through a browser file input or drag-and-drop. JavaScript receives <code>File</code> objects; selection alone does not upload them.</li><li>The chosen importer reads bytes or text with <code>File</code>, <code>Blob</code>, and typed-array APIs. Format signatures and resource limits are checked before expensive work.</li><li>PNG-backed formats use local image decoding and canvas when needed. Project-owned GIF and APNG logic parses animation structures before producing RGBA snapshots.</li><li>The importer creates a source-independent <code>SpriteProject</code> containing frames, supported layers, and cels.</li><li>Validation checks frame references, dimensions, durations, layer properties, RGBA byte lengths, and structures the exporter relies on.</li><li>The preview reads the same model. Duration and layer-name edits update local state.</li><li>The selected exporter creates the requested output bytes in memory. <code>Blob</code> URLs offer the resulting file or files as browser downloads.</li></ol>

    <div class="mini-diagram">selected local File(s)
        ↓ local parser / decoder
validated SpriteProject
        ↓ preview and optional edits
selected output bytes
        ↓ Blob URL
browser download</div>

    <h2>What the network is used for</h2>
    <p>Opening the production site requests static resources from Cloudflare Pages. The host may receive ordinary web request metadata such as IP address, user agent, referrer, requested path, and timing according to its infrastructure and configuration. Those requests are separate from conversion and should not contain selected artwork, embedded project pixels, source metadata, or the generated output files.</p>
    <p>The project has no conversion backend, upload endpoint, database, cloud artwork store, or remote image-processing fallback. If a browser lacks a required local API or reaches a memory limit, the importer reports a failure; it does not send the file elsewhere.</p>

    <h2>Format-specific local work</h2>
    <p>Simple PNG inputs are signature-checked and decoded with browser image facilities. Piskel and Pixilart JSON is parsed locally and embedded PNGs are decoded in the tab. ZIP-based OpenRaster, Pixelorama, and Krita projects validate archive entries and decompress supported content locally. PSD parsing and channel decoding also stay in the page. The GIF importer owns its LZW and compositing logic, while APNG parsing validates chunks and uses local bounded decompression.</p>

    <h2>Why browser memory can exceed file size</h2>
    <p>Compressed input size is not decoded cost. One RGBA image needs roughly <code>width × height × 4</code> bytes. That amount can multiply by frames and layers, while source bytes, decoded images, canvas copies, preview state, and output bytes coexist. A 1,024×1,024 RGBA cel is about 4 MiB before JavaScript and browser overhead; one hundred full-canvas frames approach 400 MiB for cel pixels alone.</p>
    <p>Importers enforce format-specific limits rather than returning partial projects. If a conversion is too large, reduce canvas, frame, or layer count, split the work, or use a less memory-constrained desktop environment. There is no hidden server fallback.</p>

    <h2>External links are separate actions</h2>
    <p>Following the GitHub repository or optional support link navigates to another service governed by its own policy. Attaching a file to an issue, email, chat, cloud drive, or validator is also separate from browser-local conversion. Use a newly created minimal reproduction instead of private artwork when reporting a problem.</p>

    <h2>Advertising status and boundaries</h2>
    <p>Public pages contain Google AdSense account-verification metadata, but the current repository does not load a live AdSense script or render ad units. The privacy policy describes how the site would need to handle third-party advertising if it is activated later. Advertising must remain separate from file selection, conversion, errors, and downloads.</p>

    <h2>How to verify the boundary yourself</h2>
    <ol><li>Load the production page and allow its static assets to finish.</li><li>Open the browser Network panel and clear the request list.</li><li>Convert a tiny synthetic PNG sequence or project fixture that contains no private work.</li><li>Confirm no new request body or URL contains the source file, its embedded metadata, or the generated output.</li><li>Remember that clicking an external link or enabling future third-party scripts changes the set of requests and should be reviewed separately.</li></ol>
    <p>For the representation created in the middle of this pipeline, see <a href="/articles/aseprite-frames-layers-cels/">the SpriteProject data-model article</a>. The full policy is at <a href="/privacy/">Privacy</a>.</p>
  `,

  "/articles/verify-sprite-conversion/": `
    <p>A downloaded file is not proof that a conversion is correct. A useful verification process compares the source facts that still exist, the normalized preview, and the final output. This article turns that comparison into a small acceptance test you can repeat before relying on a converted sprite.</p>

    <h2>Begin with a written source inventory</h2>
    <p>Before converting, record the source canvas size, expected frame count, frame order, known timing, transparency, and any editor structure you expect to remain editable. For a structured project, also record visible layer names, order, opacity, and whether any cel is smaller than the full canvas or positioned away from <code>(0, 0)</code>. This inventory prevents a visually plausible result from hiding a structural loss.</p>
    <p>Only record information the source actually contains. A PNG sequence can establish pixels, dimensions, and order supplied by the selected files, but it cannot establish an original layer stack. A GIF can establish decoded rendered frames and timing, but it cannot reveal the editor objects used before the GIF was exported. A project format may contain layers, yet the importer still needs explicit support for their types and properties.</p>

    <h2>Use a small diagnostic source first</h2>
    <p>A tiny diagnostic file makes wrong results obvious. Use an asymmetric mark near one edge, at least one transparent pixel, two visibly different frames, and distinct delays when the format supports timing. For a layered source, put a recognizable mark on each raster layer and use different names or opacity values. Avoid confidential artwork; a new synthetic sprite is easier to share if a bug needs investigation.</p>
    <p>The <a href="/compatibility-lab/">compatibility lab</a> publishes deterministic examples for PNG sequence, spritesheet metadata, Piskel, Pixilart, Pixelorama, OpenRaster, Krita, PSD, GIF, and APNG. Those files are useful baselines because the page records the observed dimensions, frame counts, timing, layers, and intentional rejection boundaries.</p>

    <h2>Check the normalized project before download</h2>
    <p>The in-page preview reads the same <code>SpriteProject</code> that the exporters consume. Inspect it before creating output:</p>
    <ol class="steps"><li>Confirm the canvas width and height match the intended coordinate space.</li><li>Step through every frame and compare its order and visible pixels.</li><li>Check each displayed duration, especially where source delays differ.</li><li>Look at transparent edges and partially occupied cels for unexpected backgrounds or clipping.</li><li>For supported layered inputs, compare layer names, order, visibility, opacity, and cel placement.</li><li>Stop if a required property is absent; changing the output format cannot recreate information the importer did not receive.</li></ol>
    <p>If the preview is already wrong, downloading again is not a useful test. Return to the source-mode guide, verify that the chosen importer matches the file, and read the exact validation message. The converter rejects many ambiguous structures intentionally rather than guessing.</p>

    <h2>Open and inspect the exported result</h2>
    <p>For Aseprite output, open the downloaded file in Aseprite and repeat the inventory check. Confirm document dimensions, timeline length, duration per frame, visible animation, layer stack, cel positions, opacity, and transparency. Toggle supported layers individually. Edit one cel and confirm the change does not unexpectedly affect another frame or layer.</p>
    <p>For PNG sequence output, verify the file count and filename order, then compare every flattened frame. For spritesheet output, verify the sheet dimensions, frame rectangles, durations, trimming fields, and JSON-to-PNG pairing. A valid JSON file with the wrong companion image is still the wrong result.</p>

    <h2>Separate visual equivalence from editability</h2>
    <p>Two images can look identical while having different editable structure. A flattened frame can reproduce the visible composite but cannot let you hide the original ink layer, rename a source layer, or edit one cel independently. Conversely, a layered result can preserve supported structure while unsupported blend behavior changes the appearance; the conservative importers reject known incompatible cases instead of labeling them preserved.</p>
    <p>Use two acceptance statements rather than one vague “looks correct” result:</p>
    <ul><li><strong>Rendered-frame check:</strong> the expected visible pixels, transparency, order, and timing match for the tested frames.</li><li><strong>Editable-structure check:</strong> the supported source layers, properties, and cel relationships remain separately editable where the source contained them.</li></ul>

    <h2>Test boundaries as well as success</h2>
    <p>A trustworthy converter should fail clearly outside its supported subset. Keep the good diagnostic file, then change one condition at a time: make one PNG dimension differ, use an invalid grid size, move an atlas rectangle beyond the image, or introduce an unsupported project layer type in a disposable copy. The expected result is a specific rejection, not a partial download with silently missing data.</p>
    <p>Do not corrupt private work to perform this test. Repository fixtures are synthetic and the public lab links to the exact generator and assertions used for maintained compatibility claims. They give you a reproducible boundary without risking an original project.</p>

    <h2>Record enough detail to reproduce a defect</h2>
    <p>When a check fails, record the input mode, output format, browser, operating system, Aseprite version, safe error text, canvas dimensions, frame count, layer count, and the first frame where actual behavior differs. Reduce the source to the smallest newly created file that still demonstrates the problem. Never publish private artwork merely to prove that a conversion failed.</p>
    <p>Use <a href="/troubleshooting/">symptom-based troubleshooting</a> for immediate causes, then consult the matching <a href="/guides/">format guide</a> for its accepted subset. For the meaning of frames, layers, and cels, return to <a href="/articles/aseprite-frames-layers-cels/">the data-model explanation</a>.</p>
  `,

  "/troubleshooting/": `
    <p>Start with the visible symptom, then check the source contract for the selected mode. The converter rejects malformed or ambiguous input instead of guessing missing data, so the first diagnostic often points to the boundary that protects the output.</p>

    <h2>The Convert button is unavailable</h2>
    <p><strong>Likely cause:</strong> the selected file set is incomplete or the spritesheet grid is not ready. PNG + JSON needs both matching files; most project and animation modes need exactly one file; grid mode additionally needs a positive exact-fit configuration.</p>
    <p><strong>Practical fix:</strong> choose the mode first, clear unrelated files, select the required set again, and review the status beside the controls. In grid mode, wait for the local dimension preview and make the overlay cover the image exactly. See the <a href="/guides/">format chooser</a>.</p>

    <h2>Invalid or unsupported file type</h2>
    <p><strong>Likely cause:</strong> the extension is not accepted for the mode, or the bytes do not match the claimed format. Renaming a JPEG to <code>.png</code> does not add a PNG signature.</p>
    <p><strong>Validation:</strong> flat image importers check signatures; project readers validate their JSON, ZIP, or binary container identity before mapping artwork.</p>
    <p><strong>Practical fix:</strong> reopen the source in the program that created it and save or export a fresh file in the documented format.</p>

    <h2>PNG sequence dimensions do not match</h2>
    <p><strong>Likely cause:</strong> at least one decoded frame has a different canvas width or height from the first file.</p>
    <p><strong>Validation:</strong> the importer reports the one-based frame number and both dimensions; it does not scale or crop.</p>
    <p><strong>Practical fix:</strong> resize the canvas or add transparent padding so all frames share one size, then check their supplied order. Follow the <a href="/guides/png-sequence-to-aseprite/">PNG sequence preparation steps</a>.</p>

    <h2>The spritesheet grid does not fit</h2>
    <p><strong>Likely cause:</strong> frame width times columns or frame height times rows differs from the PNG dimensions. Margins, separators, or uneven cells are common causes.</p>
    <p><strong>Validation:</strong> all four settings must be positive integers and the grid product must equal the decoded image exactly.</p>
    <p><strong>Practical fix:</strong> crop extra borders, enter the correct divisors, or use matching atlas JSON for packed rectangles. See <a href="/guides/spritesheet-to-aseprite/">grid and atlas examples</a>.</p>

    <h2>Spritesheet metadata is malformed</h2>
    <p><strong>Likely cause:</strong> a frame rectangle is invalid or outside the PNG, durations are not positive, trimming metadata is incomplete, the rotation value or convention is unsupported, or the JSON uses another schema.</p>
    <p><strong>Validation:</strong> the importer accepts only supported root-level frame layouts and validates every rectangle before building a project.</p>
    <p><strong>Practical fix:</strong> pair the JSON with the image from the same export. Re-export rather than editing coordinates blindly. If a clean frame sequence is available, use it as a fallback.</p>

    <h2>A project file is rejected</h2>
    <p><strong>Likely cause:</strong> its version or structure differs from the tested subset, required layer data is absent, the archive is unsafe or malformed, or editor-only features are present.</p>
    <p><strong>Validation:</strong> project importers check identity, versions, dimensions, resource limits, required entries, layer coverage, and pixel payloads. A valid file can still be unsupported.</p>
    <p><strong>Practical fix:</strong> make a simplified copy in the source editor, keep supported raster layers, and remove only features you can safely rasterize. Use the specific <a href="/guides/pixilart-to-aseprite/">Pixilart</a>, <a href="/guides/piskel-to-aseprite/">Piskel</a>, or <a href="/guides/project-files-to-aseprite/">raster project</a> guide.</p>

    <h2>Unsupported layer type or blend mode</h2>
    <p><strong>Likely cause:</strong> the source contains a group, vector layer, tilemap, text object, smart object, mask, effect, adjustment, clipping behavior, or non-normal blend.</p>
    <p><strong>Validation:</strong> these are rejected instead of flattened and mislabeled as preserved editor layers.</p>
    <p><strong>Practical fix:</strong> retain the original, then create a separate simplified raster copy. If editability is not required, export rendered frames and use PNG sequence, spritesheet, GIF, or APNG mode.</p>

    <h2>GIF or APNG is reported as unsupported</h2>
    <p><strong>Likely cause:</strong> the file uses valid animation features outside the narrow decoder subset, is a static PNG selected in APNG mode, or has malformed timing, bounds, sequence, CRC, palette, filter, compression, or disposal data.</p>
    <p><strong>Practical fix:</strong> re-export a non-interlaced animation using ordinary supported settings, or export a PNG sequence. Compare GIF and APNG behavior in the <a href="/guides/gif-apng-to-aseprite/">animation guide</a>.</p>

    <h2>The output opens but looks wrong</h2>
    <p>Compare the in-page preview and Aseprite result in this order: canvas size, frame count, frame order, frame duration, transparency, cel offset, layer order, visibility, and opacity. For GIF/APNG, inspect the frame after a partial rectangle or disposal operation. For trimmed atlases, inspect placement at the canvas edges.</p>
    <p>If the output has one layer from PNG, spritesheet, GIF, or APNG, that is expected. Those flat sources cannot recover original editor layers. If Aseprite itself reports an open error, record the exact Aseprite version and message and keep the generated file for a minimal report.</p>

    <h2>Very large files, a frozen tab, or browser reload</h2>
    <p><strong>Likely cause:</strong> decoded RGBA pixels and intermediate copies exceed practical memory even though the compressed file is small. Cost grows with canvas area, frames, layers, previews, and output bytes.</p>
    <p><strong>Practical fix:</strong> close memory-heavy tabs, use an up-to-date 64-bit desktop browser, reduce empty canvas, split long animations, or reduce layer count. The app intentionally has no remote fallback for oversized artwork. Read <a href="/articles/browser-local-conversion/">the memory and privacy architecture</a>.</p>

    <h2>The download does not start</h2>
    <p>Check the browser downloads list, allow generated downloads for the site, and disable an extension that blocks Blob URLs. Changing mode or clearing selected files invalidates the previous conversion result, so convert again before downloading. Do not upload private artwork to another service just to work around a local download restriction.</p>

    <h2>Report a problem without exposing artwork</h2>
    <p>Create the smallest new synthetic file that demonstrates the issue. Include the import mode, browser, operating system, Aseprite version, exact safe diagnostic, source dimensions, and expected frame/layer behavior. Attaching anything to GitHub is an external sharing action and is not part of the local conversion privacy boundary.</p>
  `,

  "/about/": `
    <p>Sprite Converter is an open-source browser utility for moving supported sprite projects through one documented internal model. It rebuilds editable Aseprite timelines and can export normalized projects as Aseprite, flattened PNG frames, or a spritesheet with JSON metadata.</p>

    <h2>Why the project is conservative</h2>
    <p>Creative-file formats often contain far more than visible pixels. Groups, masks, effects, color profiles, tilemaps, text, vector data, animation controls, and application metadata may not have a faithful place in the current model. The importers reject ambiguous or unsupported structures instead of silently producing an output that appears more complete than it is.</p>
    <p>This is why support varies by format. PNG sequence and spritesheet workflows rebuild flat timelines. GIF and APNG also rebuild rendered frames with supported timing and compositing. Structured project formats preserve layers only when the source contains supported raster layer data and its tested subset maps cleanly.</p>

    <h2>Engineering approach</h2>
    <ul><li>File processing remains in the browser; there is no artwork upload or conversion backend.</li><li>Every importer produces the canonical <code>SpriteProject</code>.</li><li>Each exporter consumes only that model and writes one supported output: a 32-bit RGBA Aseprite project, flattened PNG sequence, or spritesheet PNG + JSON.</li><li>Binary writer changes and parser behavior are covered by synthetic, reproducible tests.</li><li>Malformed input is rejected with content-safe diagnostics rather than partially accepted.</li><li>Compatibility claims are tied to code, fixtures, and format notes in the repository.</li></ul>

    <h2>Original format research</h2>
    <p>The project includes focused work on PNG sequences, grids, atlas metadata, Piskel, Pixilart, GIF, APNG, OpenRaster, Pixelorama, Krita, and PSD. The Pixilart 2.7 path is a representative example: a fixture-defined schema was replaced after a genuine local save revealed the actual container and per-frame PNG layer structure. Only synthetic pixels were committed, while the verified field relationships became tests and documentation.</p>

    <h2>Maintenance and source</h2>
    <p>The public repository is maintained under the GitHub account <a href="https://github.com/khs2325">khs2325</a>. Source, tests, task history, format notes, and current issues are available at <a href="https://github.com/khs2325/sprite-converter">github.com/khs2325/sprite-converter</a>. The repository does not present itself as a company, Aseprite partnership, or endorsement.</p>
    <p>Compatibility claims are reviewed against deterministic synthetic fixtures, importer unit tests, end-to-end conversion tests, and Aseprite writer tests. The public <a href="/compatibility-lab/">compatibility lab</a> exposes representative inputs and observed results. This page and the public evidence were last reviewed August 24, 2026.</p>
    <p>Development and compatibility research are ongoing. A listed subset describes what the current implementation has evidence to support; it does not promise every file from that application will convert.</p>

    <h2 id="contact">Questions and compatibility reports</h2>
    <p>Use the <a href="https://github.com/khs2325/sprite-converter/issues">public repository issue tracker</a> for reproducible bugs or documentation corrections. Do not post private artwork. A new tiny synthetic file that demonstrates the same structure is safer and usually easier to diagnose.</p>
    <p>Before reporting, read <a href="/troubleshooting/">Troubleshooting</a> and the matching <a href="/guides/">format guide</a>. Useful reports identify the import mode, browser, operating system, Aseprite version, exact safe error message, and expected frame or layer behavior.</p>
  `,

  "/privacy/": `
    <p class="review-line"><strong>Effective and last updated:</strong> August 24, 2026 · <strong>Maintainer:</strong> <a href="https://github.com/khs2325">khs2325</a></p>
    <p>This policy explains the privacy boundary of the production site at <code>sprite-to-aseprite.pages.dev</code>. The core conversion design keeps selected artwork and generated output bytes in the browser. It does not make unrelated hosting requests or voluntary external sharing disappear.</p>

    <h2>Artwork processing</h2>
    <p>Files you select or drop are exposed to the page through browser APIs such as <code>File</code>, <code>Blob</code>, typed arrays, image decoding, canvas, and object URLs. Parsing, validation, preview generation, and selected-output encoding run in the tab. The project has no endpoint that receives source artwork for conversion and no remote image-processing fallback.</p>
    <p>The generated output files are offered through local browser downloads. The application does not upload them after export.</p>

    <h2>Static hosting requests</h2>
    <p>Cloudflare Pages serves the site's HTML, JavaScript, CSS, and other public assets. Loading or navigating the site therefore creates ordinary web requests. The hosting provider may process standard request information—such as IP address, user agent, referrer, requested path, and timing—according to its service and configuration. Selected artwork, embedded project pixels, and generated output should not be part of those static-resource requests.</p>

    <h2>External links and support</h2>
    <p>The site links to the public GitHub repository and may link to an optional external support provider. Following a link leaves this site and is governed by that service's terms and privacy policy. Support is optional and does not unlock hidden converter functionality.</p>
    <p>Attaching files to a GitHub issue, email, cloud drive, chat, validator, or support page is a separate voluntary disclosure. Do not share private artwork when reporting a bug; make a minimal synthetic reproduction instead.</p>

    <h2>Advertising</h2>
    <p>Public pages currently contain Google AdSense account-verification metadata. The repository does not currently load a live AdSense script or display ad units. If advertising is activated later, this policy and the deployed behavior should be reviewed together before launch.</p>
    <p>If Google advertising is enabled, the browser may share information such as the visited page URL, IP address, and device or browser information with Google, and Google may set or read cookies for delivery, measurement, fraud prevention, and—where permitted—personalization. Google explains this processing in <a href="https://policies.google.com/technologies/partner-sites">How Google uses information from sites or apps that use its services</a>.</p>
    <p>Third-party advertising vendors, including Google, may use cookies to serve ads if their advertising services are enabled. Google may use advertising cookies to serve ads based on prior visits to this or other sites. Users can manage personalized advertising through <a href="https://adssettings.google.com/">Google Ads Settings</a>. These statements describe possible future advertising behavior; they do not state that live ads or advertising cookies are currently active.</p>
    <p>Before sending AdSense ad requests for visitors in the European Economic Area, the United Kingdom, or Switzerland, the maintainer must configure a Google-certified consent management platform and provide the required choices. No consent banner is shown now because this deployment does not make AdSense ad requests.</p>

    <h2>Analytics, error reporting, and payments</h2>
    <p>The current repository does not add an analytics service, remote error-reporting script, conversion telemetry, or direct payment processing. External hosting and support providers may operate their own systems when their pages are requested. No secret payment information should be entered into this static converter page.</p>

    <h2>Changes and questions</h2>
    <p>Material changes to hosting, analytics, advertising, or artwork handling should be reflected here before deployment. For a technical explanation of the current boundary, read <a href="/articles/browser-local-conversion/">How browser-local conversion works</a>. Questions or corrections can be raised through the <a href="https://github.com/khs2325/sprite-converter/issues">public issue tracker</a> without attaching private artwork.</p>
  `,

  "/terms/": `
    <p class="review-line"><strong>Effective and last updated:</strong> August 24, 2026 · <strong>Maintainer:</strong> <a href="https://github.com/khs2325">khs2325</a></p>
    <p>These terms describe practical conditions for using Sprite Converter. The name is a product identity, not a guarantee that every file or conversion direction is supported. Only the documented, tested sprite-format subsets are available.</p>

    <h2>Permitted use</h2>
    <p>Use the converter only with files you have the right to process. You remain responsible for the source artwork, the generated output, and checking whether your use of either complies with applicable rights and obligations.</p>

    <h2>Best-effort compatibility</h2>
    <p>Conversion is provided for documented, test-backed subsets. Valid files can still contain versions or features outside those subsets. The project does not promise uninterrupted operation, universal format support, lossless conversion, exact visual equivalence, or recovery of information absent from the source.</p>
    <p>In particular, a flat PNG, spritesheet, GIF, or APNG does not contain the original editor layer stack. Structured project formats preserve layers only when the source contains supported layer data and the corresponding importer maps it.</p>

    <h2>Verify and retain originals</h2>
    <p>Keep the original files and backups. Inspect frame count, timing, canvas dimensions, transparency, layers, opacity, visibility, offsets, and representative pixels in Aseprite before relying on the generated file. A successful open or edit does not prove universal round-trip compatibility.</p>

    <h2>Browser and resource limits</h2>
    <p>The converter runs in the browser and is subject to available memory, supported web APIs, download settings, and local device behavior. Large or malformed inputs may be rejected. The project does not provide a server upload fallback, cloud storage, or recovery service.</p>

    <h2>External services</h2>
    <p>Links to GitHub, support providers, Google settings, or other sites are provided for convenience and operate under their own terms. This site does not directly process payments. Optional support does not purchase special compatibility, priority conversion, or hidden features.</p>

    <h2>No implied affiliation</h2>
    <p>The project is an independent open-source utility. It does not claim an endorsement, partnership, or official affiliation with Aseprite or the applications whose supported file subsets it reads.</p>

    <h2>Project information</h2>
    <p>Implementation details and current limitations are available in the <a href="https://github.com/khs2325/sprite-converter">public repository</a>, the <a href="/guides/">conversion guides</a>, and <a href="/troubleshooting/">troubleshooting</a>. Privacy-specific details are in the <a href="/privacy/">Privacy Policy</a>.</p>
  `,
};
