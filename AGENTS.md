# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

This public-share project must contain synthetic profile data only. Generate profiles and stylized SVG portraits with `npm run generate:synthetic`; never add employee IDs, roster-derived names or tenure, personal photos, source roster paths, or assets derived from real people. Display names should read like natural Chinese names while remaining randomly composed and unrelated to real identities. Keep the generated `profile-*` IDs, profile data, 674 fictional portrait SVGs, and avatar atlas in sync through the generators.

Keep the public template brand-neutral. Do not add company names, trademarks, internal event names, unlicensed fonts, private or unreviewed music, photos, or decorative artwork. Avatar regeneration accepts only the four documented ImageGen masters in `scripts/avatar-sources/`; public motif assets must be regenerated with `npm run generate:textures` from the pinned Lucide source. Update `ASSET-PROVENANCE.md` whenever an allowed asset changes.

Bundled music must remain individually allowlisted and provenance-cleared for redistribution, modification and commercial use. The current default is the CC0 track documented in `ASSET-PROVENANCE.md`; do not replace it, restore the former private `background-music.mp3`, or add another audio file without updating the exact source, license, attribution, conversion record, file hash, cache suffix and public-asset validator together.

Keep the public pattern texture aligned with the approved seal-texture direction: use a sparse 24×13 rhythm of larger, upright, framed motifs instead of a uniform field of small generic icons. Preserve this character through the pinned Lucide generator and provenance workflow rather than copying private artwork.

Keep isolated seal motifs strictly upright, centered on their generated 24×13 cells and free of neighbouring-cell strokes. Do not add per-cell rotation jitter. Align each inner icon's visible geometry bounds to the same center as its seal frame, make consumer mask crops derive from grid coordinates with empty horizontal neighbours, and keep `pattern-texture.svg` at `preserveAspectRatio="none"` so the CSS 24×13 crop cannot introduce aspect-ratio letterboxing or horizontal drift whenever the public texture changes.

When `pattern-texture.svg` changes, update the `?v=` suffix on every `src/App.css` and `TextureStage.tsx` consumer to the new asset SHA-256 prefix. OneStack serves this public asset from a stable CDN path, so an unchanged URL can continue returning a previous texture after upload.

Keep the README online-preview section ordered as 01 profile, 02 avatar letters and 03 main visual. Each preview image must continue linking to `https://xchangee.github.io/growth-share/`, and replacing a screenshot requires updating its exact hash and clearance record in `ASSET-PROVENANCE.md`.

Before declaring the repository ready, run `npm run verify` and validate 01/02/03 plus Q/W/E in the real browser. Preparing a build is not permission to publish it: never create a remote, push, deploy, submit a plugin, or otherwise make the project public unless the user explicitly requests that separate action.
