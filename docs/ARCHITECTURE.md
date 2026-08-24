# Architecture

## System shape

Growth Share is a client-only React application with an optional Sites packaging layer.

```text
src/config/site.ts
        |
        v
    src/App.tsx ---------> mode controls, keyboard, audio, rotation
       |    \
       |     +----------> WelcomeOverlay.tsx -> profile/main-copy DOM layers
       v
TextureStage.tsx --------> OGL/WebGL pattern, portrait atlas, letter masks
       |
       +----------------> static fallback when motion/WebGL is unavailable

scripts/generate-synthetic-data.mjs -> syntheticProfiles.generated.ts
scripts/generate-stylized-avatars.py -> 674 SVGs + avatar-atlas.png
scripts/generate-demo-textures.mjs -> neutral SVG assets + favicon + manifest

vite build -> dist/client
prepare-sites-build.mjs -> dist/server + dist/.openai/hosting.json
```

There is no application server, database, login or analytics service. The browser receives only committed static resources.

## Runtime entry points

- `index.html` provides metadata and loads `src/main.tsx`.
- `src/main.tsx` mounts the React tree.
- `src/App.tsx` owns the active experience, profile order, reduced-motion preference and optional audio state.
- `src/config/site.ts` is the first edit point for titles, labels, neutral identity, scene copy, letter words and audio configuration.
- `src/components/TextureStage.tsx` builds the OGL renderer, shaders, letter masks and atlas sampling. It caps render work against the large-screen pixel budget and exposes `data-renderer="loading|ready|fallback"` for QA.
- `src/components/WelcomeOverlay.tsx` draws the profile archive and main-visual DOM overlays, and imports the generated SVG portraits with `import.meta.glob`.
- `src/palettes.ts` and `src/motifFlicker.ts` contain render palettes and flicker timing.
- `src/App.css` and `src/index.css` contain the presentation layer.

## Experience modes

The public interface presents three stable positions:

1. profile archive;
2. avatar-letter sequence;
3. main visual.

The labels and public copy are configurable, while the internal mode identifiers are part of the UI and browser-QA contract. Q, W and E map to the three positions. A change to their identity must update controls, keyboard handling, DOM data attributes, tests and documentation together.

## Data and asset pipelines

### Profiles

`scripts/generate-synthetic-data.mjs` turns a seed into a fixed-size set of unique `profile-*` records. Each record has only `profileId`, `displayName` and `dayCount`. The generated TypeScript module is committed so normal consumers do not need the generator at runtime.

### Portraits

`scripts/generate-stylized-avatars.py` treats exactly four PNG files as 8×8 source sheets. Their 256 fictional base portraits are expanded deterministically into 674 variants, and all outputs are staged in a temporary directory. The script validates source shape, output names, SVG element safety, uniqueness, atlas dimensions and blank padding before replacing the committed output set.

The DOM overlay consumes individual SVGs. WebGL consumes the 32×22 atlas. The four masters, generator, individual outputs and atlas hashes are recorded together in `scripts/avatar-output.manifest.json`; these files and their profile count form one versioned unit.

### Static artwork

`scripts/generate-demo-textures.mjs` deterministically creates the neutral pattern, WebGL coordinate map, paper grain, memory symbol and favicon. It pins `lucide-static` 1.33.0 for icon geometry and records generator, license and output hashes in `scripts/demo-textures.manifest.json`.

Public URLs should be derived from `import.meta.env.BASE_URL`, so a `VITE_BASE_PATH` build can run below a host subpath. Every non-code asset must have a cleared row in `ASSET-PROVENANCE.md` before external publication.

## Build targets

- `npm run build:client`: Vite client build into `dist/client`.
- `npm run build`: typecheck, client build and Sites packaging.
- `scripts/prepare-sites-build.mjs`: copies the worker and hosting descriptor into `dist`.
- `worker/index.js`: delegates asset requests to the Sites `ASSETS` binding and falls back to `index.html` for extensionless SPA routes.
- `tests/sites-worker.test.mjs`: validates asset delegation, SPA fallback, non-HTML misses and required build artifacts.

The `.openai/hosting.json`, worker, preparation script and worker tests are a coordinated integration surface.

## Invariants

- Public profile content is synthetic only.
- The generated profile module, 674 SVG filenames and atlas population remain synchronized.
- Generated directories contain no unrelated files; the avatar script deliberately refuses unsafe cleanup.
- SVG portraits contain only the expected vector elements and no text, embedded images, metadata or external links.
- Build output is reproducible from the lockfiles and committed source.
- Building is local and reversible; publishing is a separate, explicitly authorized action.

## Known structural boundaries

The default profile count, atlas grid, source-sheet layout and rendering budget are coordinated constants rather than general user settings. Changing one requires a migration across both generators, `TextureStage.tsx`, asset consumers and validation. The app is optimized for event-wall displays; responsive loading is supported, but mobile product UX is not its primary contract.
