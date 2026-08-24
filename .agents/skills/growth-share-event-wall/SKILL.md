---
name: growth-share-event-wall
description: Customize, rebrand, regenerate synthetic-only profiles and portraits, browser-QA, and build the Growth Share React/Vite/WebGL event-wall template. Use in this repository or an explicit derivative; do not use for generic frontend work or real-person data.
---

# Growth Share Event Wall

Maintain and customize the application in the repository; do not copy the application into the skill.

## Establish scope

Locate the repository root and confirm it contains `package.json`, `src/components/TextureStage.tsx` and `scripts/generate-synthetic-data.mjs`. Read the root [AGENTS.md](../../../AGENTS.md) before acting. Inspect the working tree and preserve unrelated changes.

This skill is compatible with the Growth Share `0.1.x` template. If the checkout has diverged, inspect its actual scripts and paths instead of assuming this version's layout.

## Choose only the relevant route

- For titles, copy, scene labels, letter words, colors, motion, music or assets, read [docs/CUSTOMIZATION.md](../../../docs/CUSTOMIZATION.md). Read [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) when changing modes, rendering, profile count, atlas shape or other structural contracts.
- For names, day counts, portrait sheets, SVGs or the atlas, read [docs/SYNTHETIC-DATA.md](../../../docs/SYNTHETIC-DATA.md).
- For local browser testing, build artifacts or Sites handoff, read [docs/QA-AND-RELEASE.md](../../../docs/QA-AND-RELEASE.md).
- For open-source or asset review, read [ASSET-PROVENANCE.md](../../../ASSET-PROVENANCE.md) and [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md).
- For a contribution, also follow [CONTRIBUTING.md](../../../CONTRIBUTING.md).

Do not load every document when the task needs only one route.

## Preserve the hard boundaries

- Use synthetic profiles and fictional portraits only. Never import employee IDs, roster-derived names or tenure, personal photos, private paths or assets based on real people.
- Treat a generator as format validation, not proof of privacy or copyright. Do not claim an asset is cleared without provenance evidence.
- Keep generated profiles, 674 SVG portraits and the WebGL atlas synchronized through repository scripts; do not hand-edit generated values.
- Keep the neutral pattern, coordinate map, grain, memory symbol and favicon synchronized through `npm run generate:textures`; preserve their Lucide notices and manifest.
- `npm run generate:avatars` replaces generated SVGs, the atlas and their manifest after validation. Run it only when the user asked to regenerate portraits and all four source sheets are authorized.
- Preserve the Sites integration files named in `AGENTS.md` unless the requested task explicitly changes that integration and its tests.
- Building and testing are local preparation. Never deploy, upload, change visibility, create a public repository or publish a release without explicit user authorization for that external action.

## Work and verify

Prefer the public configuration in `src/config/site.ts` for ordinary identity and copy changes. For visual work, start the local server yourself, open the real browser and verify the affected modes, controls, renderer state, console and target geometry.

Use the scripts declared by the current `package.json`. Before handoff, run the smallest relevant checks plus `npm run verify` when the task changes shipped behavior or artifacts. If a command fails, report the actual blocker; do not publish around it.

## Report completion

State what changed, the commands and browser states verified, and any generator counts or hashes. List every unresolved asset, privacy or compatibility risk. Explicitly state whether anything was deployed or published.
