# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

This public-share project must contain synthetic profile data only. Generate profiles and stylized SVG portraits with `npm run generate:synthetic`; never add employee IDs, roster-derived names or tenure, personal photos, source roster paths, or assets derived from real people. Display names should read like natural Chinese names while remaining randomly composed and unrelated to real identities. Keep the generated `profile-*` IDs, profile data, 674 fictional portrait SVGs, and avatar atlas in sync through the generators.

Keep the public template brand-neutral. Do not add company names, trademarks, internal event names, unlicensed fonts, music, photos, or decorative artwork. Avatar regeneration accepts only the four documented ImageGen masters in `scripts/avatar-sources/`; public motif assets must be regenerated with `npm run generate:textures` from the pinned Lucide source. Update `ASSET-PROVENANCE.md` whenever an allowed asset changes.

Keep the public pattern texture aligned with the approved seal-texture direction: use a sparse 24×13 rhythm of larger, upright, framed motifs instead of a uniform field of small generic icons. Preserve this character through the pinned Lucide generator and provenance workflow rather than copying private artwork.

Before declaring the repository ready, run `npm run verify` and validate 01/02/03 plus Q/W/E in the real browser. Preparing a build is not permission to publish it: never create a remote, push, deploy, submit a plugin, or otherwise make the project public unless the user explicitly requests that separate action.
