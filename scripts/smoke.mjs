#!/usr/bin/env node
/**
 * HTTP smoke checks for the Next.js app.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://your-domain.com npm run smoke:production
 *   npm run smoke:build          # next build + next start + smoke (local)
 *   npm run smoke                # same as smoke:production (default base below)
 *
 * Env:
 *   SMOKE_BASE_URL  — origin only, no trailing slash (default http://127.0.0.1:3000)
 *   SMOKE_PATHS     — comma-separated paths (default /,/homepage)
 *   SMOKE_PORT      — with --with-server only (default 4310)
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const defaultPaths = ["/", "/homepage"];

function parsePaths() {
  const raw = process.env.SMOKE_PATHS;
  if (!raw?.trim()) return defaultPaths;
  return raw.split(",").map((p) => p.trim()).filter(Boolean);
}

async function fetchSmoke(baseUrl, pathname) {
  const url = `${baseUrl.replace(/\/$/, "")}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  const res = await fetch(url, {
    redirect: "follow",
    headers: { Accept: "text/html" },
  });
  const ct = res.headers.get("content-type") || "";
  const buf = await res.arrayBuffer();
  const text = new TextDecoder().decode(buf);

  if (!res.ok) {
    throw new Error(`${pathname}: HTTP ${res.status} ${res.statusText}`);
  }
  if (!ct.includes("text/html")) {
    throw new Error(`${pathname}: expected text/html, got ${ct || "(none)"}`);
  }
  if (text.length < 200) {
    throw new Error(`${pathname}: body too short (${text.length} bytes)`);
  }
  return { pathname, status: res.status, bytes: buf.byteLength };
}

export async function runSmoke(baseUrl) {
  const paths = parsePaths();
  const results = [];
  for (const p of paths) {
    results.push(await fetchSmoke(baseUrl, p));
  }
  return results;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(baseUrl, attempts = 90, delayMs = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${baseUrl}/`, { redirect: "follow" });
      if (res.ok) return;
    } catch {
      /* still starting */
    }
    await sleep(delayMs);
  }
  throw new Error(`Server at ${baseUrl} did not become ready in time`);
}

async function withLocalServer() {
  const port = process.env.SMOKE_PORT || "4310";
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
    cwd: projectRoot,
    env: { ...process.env, PORT: port },
    stdio: "inherit",
  });

  const kill = () => {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  };

  process.on("SIGINT", kill);
  process.on("SIGTERM", kill);

  try {
    await waitForServer(baseUrl);
    const results = await runSmoke(baseUrl);
    console.log("Smoke OK:", results.map((r) => `${r.pathname} ${r.status} (${r.bytes} B)`).join(", "));
  } finally {
    kill();
    await sleep(500);
    if (!child.killed) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }
  }
}

async function main() {
  const withServer = process.argv.includes("--with-server");

  if (withServer) {
    await withLocalServer();
    return;
  }

  const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
  const results = await runSmoke(baseUrl);
  console.log("Smoke OK:", results.map((r) => `${r.pathname} ${r.status} (${r.bytes} B)`).join(", "));
}

main().catch((err) => {
  console.error("Smoke failed:", err.message || err);
  process.exit(1);
});
