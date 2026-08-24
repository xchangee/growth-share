#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const executeFile = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const profileCount = 674;
const atlasGrid = { columns: 32, rows: 22, cellSize: 96 };
const atlasSize = {
  width: atlasGrid.columns * atlasGrid.cellSize,
  height: atlasGrid.rows * atlasGrid.cellSize,
};
const avatarManifestRelativePath = "scripts/avatar-output.manifest.json";
const avatarManifestPath = path.join(projectRoot, avatarManifestRelativePath);
const avatarGeneratorRelativePath = "scripts/generate-stylized-avatars.py";
const expectedProfileNames = Array.from(
  { length: profileCount },
  (_, index) => `profile-${String(index + 1).padStart(4, "0")}.svg`,
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readPngDimensions(buffer, label) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  assert.ok(buffer.length >= 24, `${label} is too small to be a PNG`);
  assert.ok(buffer.subarray(0, 8).equals(signature), `${label} is not a PNG`);
  assert.equal(buffer.toString("ascii", 12, 16), "IHDR", `${label} has no PNG IHDR`);

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function validateProfileModule() {
  const profilePath = path.join(
    projectRoot,
    "src/data/syntheticProfiles.generated.ts",
  );
  const generatorPath = path.join(
    projectRoot,
    "scripts/generate-synthetic-data.mjs",
  );
  const currentModule = await readFile(profilePath, "utf8");
  const rows = [...currentModule.matchAll(/^\s*(\{"profileId":.+\}),\s*$/gm)].map(
    ([, row]) => JSON.parse(row),
  );

  assert.equal(rows.length, profileCount, `Expected ${profileCount} synthetic profiles`);
  assert.equal(new Set(rows.map(({ profileId }) => profileId)).size, profileCount);
  assert.equal(new Set(rows.map(({ displayName }) => displayName)).size, profileCount);

  rows.forEach((profile, index) => {
    const expectedId = `profile-${String(index + 1).padStart(4, "0")}`;
    assert.deepEqual(Object.keys(profile), ["profileId", "displayName", "dayCount"]);
    assert.equal(profile.profileId, expectedId);
    assert.match(profile.displayName, /^[\u3400-\u9fff]{3}$/u);
    assert.ok(
      Number.isInteger(profile.dayCount) &&
        profile.dayCount >= 90 &&
        profile.dayCount <= 8600,
      `Invalid dayCount for ${profile.profileId}`,
    );
  });

  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "growth-share-profile-check-"),
  );

  try {
    const temporaryGenerator = path.join(
      temporaryRoot,
      "scripts/generate-synthetic-data.mjs",
    );
    const temporaryOutput = path.join(
      temporaryRoot,
      "src/data/syntheticProfiles.generated.ts",
    );
    await mkdir(path.dirname(temporaryGenerator), { recursive: true });
    await mkdir(path.dirname(temporaryOutput), { recursive: true });
    await copyFile(generatorPath, temporaryGenerator);
    await executeFile(process.execPath, [temporaryGenerator], {
      cwd: temporaryRoot,
      maxBuffer: 1024 * 1024,
    });
    const regeneratedModule = await readFile(temporaryOutput, "utf8");
    if (regeneratedModule !== currentModule) {
      throw new Error(
        "Synthetic profile output is stale; run npm run generate:profiles " +
          `(committed=${sha256(currentModule)}, generated=${sha256(regeneratedModule)})`,
      );
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  return sha256(currentModule);
}

async function discoverAvatarSourcePaths() {
  const sourceDirectory = path.join(projectRoot, "scripts/avatar-sources");
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  assert.ok(
    entries.every((entry) => entry.isFile()),
    "Avatar source directory must contain files only",
  );
  const names = entries.map((entry) => entry.name).sort();
  assert.ok(names.length > 0, "Avatar source directory is empty");
  names.forEach((name) => {
    assert.match(
      name,
      /^open-source-avatar-master-\d{2}\.png$/,
      `Unexpected avatar source: ${name}`,
    );
  });

  return names.map((name) => `scripts/avatar-sources/${name}`);
}

async function validateAvatarSources(expectedPaths) {
  assert.ok(Array.isArray(expectedPaths) && expectedPaths.length > 0);
  assert.equal(new Set(expectedPaths).size, expectedPaths.length);
  const actualPaths = await discoverAvatarSourcePaths();
  assert.deepEqual(actualPaths, expectedPaths, "Avatar source list differs from its manifest");

  const records = [];
  for (const relativePath of expectedPaths) {
    assert.match(
      relativePath,
      /^scripts\/avatar-sources\/open-source-avatar-master-\d{2}\.png$/,
      `Unsafe avatar source path in manifest: ${relativePath}`,
    );
    const contents = await readFile(path.join(projectRoot, relativePath));
    const dimensions = readPngDimensions(contents, relativePath);
    assert.equal(dimensions.width, dimensions.height, `${relativePath} must be square`);
    assert.ok(
      dimensions.width >= 1024,
      `${relativePath} must be at least 1024px square`,
    );
    records.push({ path: relativePath, sha256: sha256(contents) });
  }

  return records;
}

async function validateAvatarOutputs() {
  const avatarDirectory = path.join(
    projectRoot,
    "src/assets/synthetic-avatars",
  );
  const entries = await readdir(avatarDirectory, { withFileTypes: true });
  assert.ok(entries.every((entry) => entry.isFile()), "Avatar output contains a directory");
  const actualNames = entries.map((entry) => entry.name).sort();
  assert.deepEqual(
    actualNames,
    expectedProfileNames,
    `Expected exactly ${profileCount} generated profile SVGs`,
  );

  const collection = createHash("sha256");
  const individualHashes = new Set();
  for (const name of expectedProfileNames) {
    const content = await readFile(path.join(avatarDirectory, name), "utf8");
    assert.match(content, /<svg\b[^>]*viewBox="0 0 512 512"/i, `${name} has an invalid root`);
    assert.doesNotMatch(
      content,
      /<(?:text|image|metadata)\b|(?:^|\s)(?:href|xlink:href)\s*=/i,
      `${name} contains unsafe embedded or external content`,
    );
    const tags = [...content.matchAll(/<\/?([a-z][\w:-]*)\b/gi)].map(([, tag]) =>
      tag.toLowerCase(),
    );
    assert.ok(
      tags.every((tag) => ["svg", "rect", "path"].includes(tag)),
      `${name} contains an unexpected SVG element`,
    );

    const digest = sha256(content);
    assert.ok(!individualHashes.has(digest), `${name} duplicates another avatar`);
    individualHashes.add(digest);
    collection.update(name, "ascii");
    collection.update("\0");
    collection.update(digest, "ascii");
    collection.update("\n");
  }

  const atlasPath = path.join(projectRoot, "public/assets/avatar-atlas.png");
  const atlas = await readFile(atlasPath);
  assert.deepEqual(
    readPngDimensions(atlas, "avatar-atlas.png"),
    atlasSize,
    "Avatar atlas dimensions do not match the 32x22 grid",
  );

  return {
    svgCollection: {
      directory: "src/assets/synthetic-avatars",
      count: profileCount,
      sha256: collection.digest("hex"),
    },
    atlas: {
      path: "public/assets/avatar-atlas.png",
      ...atlasGrid,
      ...atlasSize,
      sha256: sha256(atlas),
    },
  };
}

async function readAvatarManifest() {
  try {
    return JSON.parse(await readFile(avatarManifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Missing ${avatarManifestRelativePath}; run npm run generate:avatars`,
      );
    }
    throw error;
  }
}

async function createAvatarManifest(sourcePaths) {
  const sources = await validateAvatarSources(sourcePaths);
  const generator = await readFile(
    path.join(projectRoot, avatarGeneratorRelativePath),
  );
  const outputs = await validateAvatarOutputs();

  return {
    schemaVersion: 1,
    profileCount,
    sources,
    generator: {
      path: avatarGeneratorRelativePath,
      sha256: sha256(generator),
    },
    outputs,
  };
}

async function writeAvatarManifest(manifest) {
  const temporaryPath = `${avatarManifestPath}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(temporaryPath, avatarManifestPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function parseMode(arguments_) {
  if (arguments_.length === 0) return "check";
  if (arguments_.length === 1 && arguments_[0] === "--update-avatar-manifest") {
    return "update";
  }
  throw new Error(
    "Usage: node scripts/check-generated-assets.mjs [--update-avatar-manifest]",
  );
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const profileModuleSha256 = await validateProfileModule();
  const expectedManifest = mode === "check" ? await readAvatarManifest() : null;
  const sourcePaths =
    expectedManifest === null
      ? await discoverAvatarSourcePaths()
      : expectedManifest.sources?.map((source) => source.path);
  const actualManifest = await createAvatarManifest(sourcePaths);

  if (mode === "update") {
    await writeAvatarManifest(actualManifest);
  } else {
    assert.deepEqual(
      actualManifest,
      expectedManifest,
      "Avatar sources, generator, or outputs differ from their manifest; " +
        "run npm run generate:avatars after reviewing the change",
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        profileCount,
        profileModuleSha256,
        avatarSourceCount: actualManifest.sources.length,
        avatarGeneratorSha256: actualManifest.generator.sha256,
        atlasSha256: actualManifest.outputs.atlas.sha256,
        svgCollectionSha256: actualManifest.outputs.svgCollection.sha256,
        avatarManifest: mode === "update" ? "updated" : "verified",
      },
      null,
      2,
    )}\n`,
  );
}

await main();
