# Customization guide

## Start with the public configuration

Ordinary rebranding should begin in `src/config/site.ts`. It centralizes:

- document title and description;
- the three scene labels;
- neutral header, footer, profile and main-visual copy;
- the letter sequence shown by the WebGL scene;
- the optional background-music URL.

Keep the default identity neutral. Do not reintroduce a company name, logo, mission statement, internal event name or music unless the publisher has recorded its rights in `ASSET-PROVENANCE.md`.

After a configuration change, run the app and verify all three scenes. Configuration values may appear in HTML metadata, controls, accessible names, overlays and WebGL masks; search the full repository for old wording before declaring a rebrand complete.

## Common changes

### Title and event copy

Edit the corresponding fields in `src/config/site.ts`. Preserve meaningful visible text rather than converting ordinary copy into decorative SVGs. Update `index.html` only when a value cannot be supplied by the runtime configuration.

### Scene labels and keyboard order

Labels belong in the configuration. The scene order and Q/W/E mapping are controlled by `src/App.tsx`. Changing order is an interaction change and requires browser QA of controls, `aria-pressed` state and DOM data attributes.

### Letter sequence

Edit the configured word list, then inspect `src/components/TextureStage.tsx` before changing its length or typography. The renderer builds a multi-row mask texture and contains per-word layout behavior; a new word may need a layout preset, width limit or tracking adjustment.

Test each word at the target display size. Do not infer centering from canvas dimensions alone—inspect the rendered glyph bounds or a trustworthy screenshot captured at the real device metrics.

### Profile copy and rotation

Public profile records provide only ID, display name and a synthetic day count. The archive overlay derives display lines from those values. Copy logic and archive layout live in `src/components/WelcomeOverlay.tsx`; rotation timing and shuffled profile order live in `src/App.tsx`.

Never add fields from a roster. If a design needs more profile attributes, extend the synthetic generator first and document how each field avoids identifying a real person.

### Color and motion

- Edit shader palettes in `src/palettes.ts`.
- Edit motif flicker timing in `src/motifFlicker.ts`.
- Edit DOM layout and responsive behavior in `src/App.css`.
- Edit renderer timing or shader behavior in `src/components/TextureStage.tsx` only when the request requires a rendering change.

Keep `prefers-reduced-motion` and the static fallback functional. A visual change is not complete until both the normal and fallback states remain readable.

### Music

The public default has no music URL. Setting one enables the existing audio control; browsers may still require a user gesture before playback.

Before adding a file:

1. confirm redistribution, modification and commercial-use terms;
2. add title, author, source, license and attribution to `ASSET-PROVENANCE.md`;
3. store only the necessary encoded file and remove private metadata;
4. test play, pause, loop, failure and disabled states.

Do not use a local streaming cache, protected media or a track with unknown provenance.

### Static assets and fonts

Use paths based on Vite's base URL rather than root-absolute `/assets/...` URLs. If an asset is replaced, update its provenance row—the clearance does not transfer by filename.

The default pattern, coordinate map, grain, memory symbol and favicon are generated. Edit `scripts/generate-demo-textures.mjs`, then run:

```bash
npm run generate:textures
npm run check:assets
```

Keep the Lucide notices and `scripts/demo-textures.manifest.json` synchronized.

The public template relies on CSS system-font stacks and does not bundle a font file. Verify computed fonts on the target operating system. A newly bundled font needs its license text and attribution in `THIRD_PARTY_NOTICES.md`, a cleared provenance row and an update to the public-asset allowlist.

## Structural changes

Changing any of the following is an architecture task, not a copy edit:

- 674 profile count;
- four source sheets or their 8×8 grid;
- 32×22 atlas grid or 96 px cell size;
- the large-screen render pixel budget;
- the number or identity of experience modes.

Map all producers and consumers using `docs/ARCHITECTURE.md`, update validation alongside implementation, regenerate outputs and report hashes and file counts.

## Completion checklist

- Search confirms old titles, names and marks are gone from source and SVG text.
- 01/02/03 and Q/W/E work in a real browser.
- All configured letter words render without clipping or incorrect alignment.
- Music behavior matches the configured enabled or disabled state.
- Normal, reduced-motion and WebGL fallback states remain legible.
- `npm run verify` passes.
- Every new asset has a cleared provenance entry.
- No build, upload, deployment or public release was performed without explicit authorization.
