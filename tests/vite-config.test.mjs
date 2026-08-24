import assert from "node:assert/strict";
import test from "node:test";
import {
  createViteConfig,
  normalizeBasePath,
  parseAllowedHosts,
} from "../vite.config.mjs";

test("normalizes root, relative, subpath, and absolute URL base paths", () => {
  assert.equal(normalizeBasePath(undefined), "/");
  assert.equal(normalizeBasePath("/"), "/");
  assert.equal(normalizeBasePath("."), "./");
  assert.equal(normalizeBasePath("growth-share"), "/growth-share/");
  assert.equal(normalizeBasePath("/growth-share/"), "/growth-share/");
  assert.equal(
    normalizeBasePath("https://cdn.example.test/growth-share"),
    "https://cdn.example.test/growth-share/",
  );
});

test("keeps the local app host and adds configured preview hosts safely", () => {
  assert.deepEqual(parseAllowedHosts(undefined), ["terminal.local"]);
  assert.deepEqual(parseAllowedHosts(" preview.example.test, terminal.local "), [
    "terminal.local",
    "preview.example.test",
  ]);
});

test("builds a portable configuration from environment values", () => {
  const config = createViteConfig({
    VITE_ALLOWED_HOSTS: "preview.example.test",
    VITE_BASE_PATH: "/demo",
    VITE_HOST: "127.0.0.1",
  });

  assert.equal(config.base, "/demo/");
  assert.equal(config.server.host, "127.0.0.1");
  assert.equal(config.preview.host, "127.0.0.1");
  assert.deepEqual(config.server.allowedHosts, [
    "terminal.local",
    "preview.example.test",
  ]);
  assert.deepEqual(config.preview.allowedHosts, config.server.allowedHosts);
});
