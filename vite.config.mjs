import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_ALLOWED_HOSTS = ["terminal.local"];

export function normalizeBasePath(value) {
  const candidate = value?.trim();

  if (!candidate || candidate === "/") return "/";
  if (candidate === "." || candidate === "./") return "./";
  if (/^https?:\/\//i.test(candidate)) {
    return candidate.endsWith("/") ? candidate : `${candidate}/`;
  }

  const path = candidate.replace(/^\/+|\/+$/g, "");
  return path ? `/${path}/` : "/";
}

export function parseAllowedHosts(value) {
  const configuredHosts = (value ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_HOSTS, ...configuredHosts])];
}

export function createViteConfig(environment = process.env) {
  const host = environment.VITE_HOST?.trim() || "0.0.0.0";
  const allowedHosts = parseAllowedHosts(environment.VITE_ALLOWED_HOSTS);

  return {
    base: normalizeBasePath(environment.VITE_BASE_PATH),
    build: {
      outDir: "dist/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    preview: {
      host,
      allowedHosts,
    },
    server: {
      host,
      allowedHosts,
      warmup: {
        clientFiles: ["./src/main.tsx"],
      },
    },
    plugins: [react()],
  };
}

export default defineConfig(createViteConfig());
