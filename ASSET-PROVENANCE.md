# Asset provenance and release status

This file is the release gate for non-code assets. Source code being MIT-licensed does not automatically change the copyright, trademark, privacy or publicity rights of an asset.

The assets listed below form the reviewed public repository asset set as of 2026-08-26. A replacement must be reviewed again; a filename does not inherit the previous file's status.

## Generated neutral textures and icons

`scripts/generate-demo-textures.mjs` pins `lucide-static` 1.33.0 and its icon names, then generates the following files. `scripts/demo-textures.manifest.json` records the generator, Lucide license and output hashes.

| Path | Origin | SHA-256 | License and status |
| --- | --- | --- | --- |
| `public/assets/pattern-texture.svg` | 24×13 deterministic grid of pinned Lucide icon geometry inside project-authored geometric seal frames | `3cba9539135daea6914d065ef11d9d665bdcce9fed7b2a5b839a7b50243808e6` | Lucide ISC/Feather MIT notices plus repository MIT for the composition; **Cleared** |
| `public/assets/motif-unit-id.svg` | Project-generated technical 24×13 coordinate map; no external visual source | `c7dc6e43024f68a014fab3ab339f741018c1c55a6e93891f5f89f6a6984c56b4` | Repository MIT License; **Cleared** |
| `public/assets/paper-grain.svg` | Project-generated SVG turbulence texture; no external visual source | `7fcee83fe8aca096ef9716154a38662ccf183bf618ed3af15d293526f3907663` | Repository MIT License; **Cleared** |
| `public/assets/open-memory-symbol.svg` | Generated from Lucide `sparkles` geometry | `1d94e13a35fac96b97f8841d8281f7c6ce9f3e6397441bc067e18773278def35` | Lucide ISC plus repository MIT for the composition; **Cleared** |
| `public/favicon.svg` | Generated from Lucide `sparkles` geometry with a project-authored neutral frame and title | `cd876837f4b88f2f4636337780680b7c1b834e1ee340286ed2fbd3abefee376e` | Lucide ISC plus repository MIT for the composition; **Cleared** |

Run `npm run generate:textures` after intentionally changing the generator, pinned package or icon set. `npm run check:assets` verifies these files against the manifest and rejects extra public media.

The pattern composition was revised on 2026-08-26 to reproduce the larger framed-motif scale, sparse rhythm and print-like texture of the approved visual reference. It uses only the pinned Lucide geometry and project-authored frames; no SVG path, Illustrator source or branded artwork from the private reference project was copied.

## AI-generated fictional portrait masters

The following four files were generated on 2026-08-22 with OpenAI's built-in ImageGen specifically for this repository. No reference image, photograph, roster or named real person was supplied.

Prompt summary: create square 8×8 contact sheets of distinct, purely fictional adult portrait illustrations in a consistent editorial linocut/screen-print style; use diverse invented features and simple clothing; preserve clear cell separation; include no words, letters, numbers, logos, trademarks, UI, signatures or watermarks. Each successive sheet requested new fictional characters while retaining the same visual system.

| Path | SHA-256 | Status |
| --- | --- | --- |
| `scripts/avatar-sources/open-source-avatar-master-01.png` | `81ffbb335fb860e77d7a3e585a4e9fd45c041c14f74283ac084b5f718e51b7b2` | **Cleared** |
| `scripts/avatar-sources/open-source-avatar-master-02.png` | `203af391f918da27d613c9814bad55fca33ebbacfa673ae3c0148d080624e698` | **Cleared** |
| `scripts/avatar-sources/open-source-avatar-master-03.png` | `e57755175c40236d0a1a30397213c6eea92eb2fb4dd1d91f65d0671729fd0b1a` | **Cleared** |
| `scripts/avatar-sources/open-source-avatar-master-04.png` | `555e522b2d49fe36563847069d4ebe2a79c2c2528a7b0e23b7dd5d3e3d40da31` | **Cleared** |

To the extent copyright or related rights exist in these outputs and are held by Growth Share contributors, those contributors license the files under the repository MIT License. AI-generated output may receive different or no copyright protection in different jurisdictions, and generation does not guarantee non-infringement. The images are not presented as portraits of specific people and must not be used to assert, infer or verify anyone's identity.

Anyone replacing a master must record the tool or author, creation date, prompt or source method, applicable terms, exact hash, whether references were used, and permission for redistribution, modification and commercial use.

## Derived portrait assets

`scripts/generate-stylized-avatars.py` converts 256 fictional base portraits into the following deterministic public-demo outputs:

| Path | Output | SHA-256 | License and status |
| --- | --- | --- | --- |
| `src/assets/synthetic-avatars/profile-*.svg` | 674 sanitized two-color SVGs | `eb93e2feb237766428e9140dd132460dcd13a6e7a8bd2ffb0758be1f6bda3f02` collection hash | Repository MIT License; **Cleared** |
| `public/assets/avatar-atlas.png` | 3072×2112 atlas, 32×22 cells of 96 px, 674 occupied | `6b5d415bc05d66785c4589b09e7198b1c9675bec9d15f529aec983a5715278d4` | Repository MIT License; **Cleared** |

The source, generator and output hashes are machine-readable in `scripts/avatar-output.manifest.json`. `npm run check:generated` validates the committed set without changing it. `npm run generate:avatars` replaces the outputs and manifest only after staged validation.

## Documentation preview

| Path | Origin | SHA-256 | License and status |
| --- | --- | --- | --- |
| `docs/assets/preview.jpg` | Browser screenshot captured on 2026-08-26 from this repository's rendered 02 `OPEN / LAB` scene at 1280×720 after the generated seal-texture revision; it contains only the cleared synthetic portraits and generated neutral assets documented above | `fac9c84b0534bf4061aa068b73faac4a31efc9739f1bc981d24e587b554c8bb9` | Repository MIT License for the composition and already-cleared source assets; **Cleared** |

## Removed legacy assets

The public release excludes the previous company/event artwork, company mission, former `TAL`/`XES` wording and music with no redistribution record. Files formerly named `business-forum*.svg` and `background-music.mp3` must not be restored from a private project or copied into a public release.

The public configuration defaults to a neutral identity and no background music. Adding music requires a new row with title, author, source URL, exact license, attribution text, file hash and evidence that redistribution and the intended use are allowed.

Decorative texture or motif files may be shipped only when they appear as a cleared row in this document. Unlisted media is not approved by omission.

## Release procedure

Before every public repository, package, archive or deployment:

1. Compare this table with every tracked non-code asset and with the built output.
2. Run `npm run check:generated` and `npm run verify`.
3. Reconfirm that the Lucide/Feather notices and all exact hashes remain present.
4. Scan source and build output for former brand names, real-person data, private paths and unlisted media.
5. Inspect new AI output for accidental text, marks or recognizable likeness; automated generation and hashes do not replace human review.

This provenance record documents the project's release decision; it is not legal advice. The party publishing a fork remains responsible for verifying rights in its jurisdiction and for every replacement asset.
