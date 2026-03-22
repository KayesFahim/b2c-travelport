#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, ".next");
const currentNode = process.versions.node || process.version || "";
const major = Number(String(currentNode).split(".")[0]) || 0;

const recommended = "20.x (LTS)";

if (major >= 23 || major < 18) {
  console.warn(
    `[predev] Warning: Node ${currentNode} is outside stable range for this Next.js setup. Recommended: ${recommended}.`
  );
  console.warn(
    "[predev] Intermittent runtime errors like `Cannot find module './chunks/undefined'` can happen on unsupported Node versions."
  );
}

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("[predev] Cleared .next cache to avoid stale chunk/runtime mismatch.");
} catch (error) {
  console.warn("[predev] Could not clear .next cache:", error?.message || error);
}
