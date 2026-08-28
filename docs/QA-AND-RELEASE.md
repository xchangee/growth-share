# QA and release guide

This guide separates local verification, artifact preparation and public release. A successful build is not a deployment and does not authorize publication.

## Local verification

Install locked dependencies and start the local server:

```bash
npm ci
npm run dev
```

Open the displayed URL in a real browser. Do not treat a successful terminal build or a DOM-only click as visual proof.

### Browser checklist

- Confirm the document title, description, favicon and visible identity are neutral or intentionally configured.
- Switch 01/02/03 with both the controls and Q/W/E.
- Confirm the active control has the correct `aria-pressed` state and the app's experience data attributes match the screen.
- Watch at least one profile change and the complete configured letter sequence.
- Check that no image, font, atlas, audio or SVG request returns an error.
- If music is disabled, confirm the control communicates that state. If enabled, check play, pause, loop, blocked autoplay and recovery from a failed play request.
- Inspect `data-renderer`: normal WebGL should reach `ready`; reduced-motion or a forced initialization failure should reach `fallback` without a blank page.
- Check the browser console for errors and warnings.
- Inspect actual viewport, CSS canvas size, backing-store size, device-pixel ratio and overflow at the target installation resolution.

For exact large-screen review, configure the browser to the real CSS and device metrics before taking screenshots. Confirm the captured file's true MIME type and pixel dimensions before using it for alignment or pixel analysis.

## Automated checks

The full supported check is:

```bash
npm run verify
```

Focused commands are available when diagnosing a failure:

```bash
npm run typecheck
npm run check:generated
npm run check:assets
npm run test:config
npm run test:portability
npm run build:client
npm run build
npm run test:sites
npm run test:sites:built
npm run audit
```

`test:sites` is self-contained and builds before testing. `test:sites:built` tests the current `dist` tree without rebuilding and is intended for an already controlled pipeline. `test:portability` builds in an isolated temporary directory and verifies subpath output.

`check:generated` is read-only: it regenerates profiles in a temporary location and verifies the four portrait masters, avatar generator, 674 SVGs and atlas against `scripts/avatar-output.manifest.json`.

`check:assets` verifies the approved public-asset allowlist, source manifest and absence of blocked legacy brand or music files.

The repository CI runs `npm ci` followed by `npm run verify` on Node.js 22 and 24. Local verification should use a supported Node version even when a newer runtime happens to work.

## Artifacts

`npm run build:client` must produce:

```text
dist/client/index.html
dist/client/assets/...
```

`npm run build` must additionally produce:

```text
dist/server/index.js
dist/.openai/hosting.json
```

Use a non-root Vite base for subpath hosting:

```bash
VITE_BASE_PATH=/open-creative-wall/ npm run build:client
```

`VITE_BASE_PATH` also accepts `./` or an absolute CDN URL. Preview the resulting client before handoff, including one extensionless SPA route and direct asset URLs. Verify that built HTML and CSS use the configured base and contain no local absolute paths, private hosts, old brand terms or source maps that were not intentionally shipped.

## Pre-release gate

Before any public repository, archive, package or hosted deployment:

1. `npm run audit` and `npm run verify` pass from a clean checkout.
2. Browser QA passes at the intended wall resolution and at one ordinary desktop viewport.
3. `ASSET-PROVENANCE.md` has no blocked file in the tracked or built output.
4. A search finds no real-person data, credentials, private paths, former company marks or internal event copy.
5. `LICENSE`, `THIRD_PARTY_NOTICES.md`, contribution and security documents match the release.
6. Generated profile, SVG and atlas counts are synchronized; regeneration hashes are recorded when the inputs changed.
7. The release diff contains no `node_modules`, `dist`, local editor files or internal Git references.
8. The exact public target, repository owner, visibility and release version have been explicitly approved.

For the first public version, create a clean Git repository from the reviewed file tree rather than copying internal `.git` state. Tag the validated baseline as `v0.1.0` only after the publisher authorizes release.

## Sites handoff

Keep these files coordinated:

```text
.openai/hosting.json
worker/index.js
scripts/prepare-sites-build.mjs
tests/sites-worker.test.mjs
```

Run `npm run build` and `npm run test:sites:built` immediately before a Sites handoff. Report artifact paths and test results. Uploading, approving a release, changing hosting visibility or publishing to a CDN are external mutations and require a separate explicit instruction.

## Completion report

Every release-preparation report should include:

- files and behavior changed;
- dependency, generator and asset-provenance changes;
- commands and exact pass/fail results;
- browser, viewport, modes and renderer states checked;
- output paths and, when relevant, hashes;
- unresolved legal, privacy, compatibility or visual risks;
- an explicit statement that nothing was published when publication was not authorized.
