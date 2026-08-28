#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const executeFile = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const viteBin = path.join(projectRoot, "node_modules/vite/bin/vite.js");
const basePath = "/open-creative-wall/";
const temporaryRoot = await mkdtemp(
  path.join(tmpdir(), "open-creative-wall-subpath-build-"),
);
const outputDirectory = path.join(temporaryRoot, "client");

try {
  await executeFile(
    process.execPath,
    [viteBin, "build", "--outDir", outputDirectory, "--emptyOutDir"],
    {
      cwd: projectRoot,
      env: { ...process.env, VITE_BASE_PATH: basePath },
      maxBuffer: 5 * 1024 * 1024,
    },
  );

  const index = await readFile(path.join(outputDirectory, "index.html"), "utf8");
  assert.match(index, /href="\/open-creative-wall\/favicon\.svg"/);
  assert.match(index, /src="\/open-creative-wall\/assets\/[^"/]+\.js"/);
  assert.match(index, /href="\/open-creative-wall\/assets\/[^"/]+\.css"/);

  const assetDirectory = path.join(outputDirectory, "assets");
  const builtAssets = await readdir(assetDirectory);
  const inspectableAssets = builtAssets.filter((name) => /\.(?:css|js)$/.test(name));
  assert.ok(inspectableAssets.length >= 2, "Expected a JavaScript and CSS bundle");

  const unprefixedPublicPath = /["'`(=:,]\/(?:assets|fonts)\//;
  for (const name of inspectableAssets) {
    const contents = await readFile(path.join(assetDirectory, name), "utf8");
    assert.doesNotMatch(
      contents,
      unprefixedPublicPath,
      `${name} contains a root-only public path instead of ${basePath}`,
    );
  }

  process.stdout.write(
    `Verified ${basePath} build in an isolated temporary directory (${builtAssets.length} assets).\n`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
