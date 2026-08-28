# Synthetic data and portrait generation

## Privacy contract

Open Creative Wall is a public-demo template. It must never consume or approximate a real employee or attendee roster.

Forbidden inputs include employee IDs, names copied from a roster, actual tenure or anniversary values, personal photos, private source paths, emails, phone numbers and reference images based on identifiable people. Removing an identifier after generation does not make a real-person source acceptable.

The generated profile schema is intentionally small:

```ts
type SyntheticProfile = {
  profileId: string
  displayName: string
  dayCount: number
}
```

## Profile generator

Run with the repository default seed:

```bash
npm run generate:profiles
```

Or choose an explicit public-demo seed:

```bash
npm run generate:profiles -- --seed community-demo-2026
```

The script deterministically creates 674 unique profile IDs and display names, validates the day-count range and atomically writes `src/data/syntheticProfiles.generated.ts`. The default seed label is `open-creative-wall-public-v2`; its v2 random state is pinned so the existing public-demo records remain stable across the project rename. The seed is stored in the generated module for reproducibility.

Do not hand-edit the output. To change name composition or ranges, edit and review `scripts/generate-synthetic-data.mjs`, then regenerate and inspect the full output for inappropriate or recognizable combinations.

## Portrait generator

Inputs must be exactly four explicitly licensed, fictional portrait masters:

```text
scripts/avatar-sources/open-source-avatar-master-01.png
...
scripts/avatar-sources/open-source-avatar-master-04.png
```

Each input is a square PNG containing an 8×8 row-major grid and must be at least 1024×1024. Together they provide 256 base portraits. Deterministic geometric variants reuse each base at most three times to produce 674 unique outputs; the unused atlas slots remain paper-colored.

Only run the generator after every replacement source sheet is cleared in `ASSET-PROVENANCE.md`:

```bash
npm run generate:avatars
```

The command uses uv with versions fixed in `scripts/requirements-avatar.txt`. If the host Python is 3.14 or newer, the script re-executes through Python 3.13 because the current VTracer wheel is not considered safe on Python 3.14.

The generator:

1. validates the exact source set and dimensions;
2. stages all work in a temporary directory;
3. crops, normalizes and traces each cell;
4. sanitizes SVG output to the expected elements and attributes;
5. validates 674 unique SVGs and a 3072×2112 atlas;
6. rechecks the destination immediately before replacing generated files;
7. validates the committed result and prints collection and atlas SHA-256 values;
8. lets the enclosing npm command atomically update `scripts/avatar-output.manifest.json` with source, generator and output hashes.

Generated outputs are:

```text
src/assets/synthetic-avatars/profile-0001.svg ... profile-0674.svg
public/assets/avatar-atlas.png
scripts/avatar-output.manifest.json
```

The command is intentionally mutating. It removes only filenames matching the generated portrait pattern and refuses to proceed if the output directory contains unrelated entries.

## Full regeneration

To rebuild profiles and portraits together:

```bash
npm run generate:synthetic
```

This is not required for ordinary install, development or build because generated outputs are committed for consumers.

## Verification after generation

Record the generator's printed hashes, then run:

```bash
npm run verify
```

Also verify:

- 674 profile records and 674 portrait SVGs exist;
- profile IDs and display names are unique;
- all SVG names match their `profile-*` IDs;
- the atlas dimensions and 30 padding cells are correct;
- the profile archive and each letter word render in a real browser;
- no output contains text, embedded raster images, external links or metadata;
- no real-person data or private paths appear in source or generated files.

Regeneration is reproducible only when the seed, scripts, dependency locks and source sheets are unchanged. `npm run check:generated` verifies the checked-in masters, generator, 674 SVGs and atlas against the manifest without replacing them. Source images can contain metadata or generation-service constraints not detected by the script; the publisher must verify provenance separately.
