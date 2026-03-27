#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, ".next");
const nvmrcPath = path.join(projectRoot, ".nvmrc");
const currentNode = process.versions.node || process.version || "";
const major = Number(String(currentNode).split(".")[0]) || 0;
const supportedMajors = new Set([20, 22, 24]);
const preferredFromNvmrc = fs.existsSync(nvmrcPath)
  ? String(fs.readFileSync(nvmrcPath, "utf8")).trim() || "20"
  : "20";

if (!supportedMajors.has(major)) {
  console.error(
    `[predev] Unsupported Node ${currentNode}. Use one of: 20.x, 22.x, 24.x.`
  );
  console.error(
    `[predev] Current errors like missing .next/dev/*-manifest.json are commonly caused by unsupported Node runtimes.`
  );
  console.error(
    `[predev] Run: nvm use ${preferredFromNvmrc} (or install it first), then retry npm run dev.`
  );
  process.exit(1);
}

try {
  const shouldClean =
    String(process.env.FLYJATT_CLEAN_NEXT || "")
      .trim()
      .toLowerCase() === "true" ||
    String(process.env.FLYJATT_CLEAN_NEXT || "").trim() === "1";

  if (shouldClean) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[predev] Cleared .next cache (FLYJATT_CLEAN_NEXT enabled).");
  } else {
    console.log(
      "[predev] Keeping .next cache for faster startup. Set FLYJATT_CLEAN_NEXT=1 to force clean."
    );
  }
} catch (error) {
  console.warn("[predev] Could not clear .next cache:", error?.message || error);
}
