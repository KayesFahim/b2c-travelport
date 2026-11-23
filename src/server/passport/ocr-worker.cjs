const { parentPort, workerData } = require("node:worker_threads");
const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");
const { createWorker, PSM } = require("tesseract.js");
const { findBestMrzInText } = require("./mrz.cjs");

async function scan() {
  const input = Buffer.from(workerData.image);
  let metadata;
  try { metadata = await sharp(input, { limitInputPixels: 25_000_000 }).metadata(); }
  catch { throw Object.assign(new Error("Use a valid JPEG, PNG or WebP image."), { code: "INVALID_IMAGE" }); }
  if (!["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages || 1) > 1) {
    throw Object.assign(new Error("Use a single JPEG, PNG or WebP image."), { code: "UNSUPPORTED_IMAGE" });
  }
  const image = await sharp(input, { limitInputPixels: 25_000_000 }).rotate().resize({ width: 1800, withoutEnlargement: false }).flatten({ background: "#fff" }).grayscale().normalize().png().toBuffer();
  const { width, height } = await sharp(image).metadata();
  const variants = [];
  for (const fraction of [0.58, 0.76]) {
    const top = Math.floor(height * fraction);
    const crop = await sharp(image).extract({ left: 0, top, width, height: height - top }).extend({ top: 24, bottom: 24, left: 24, right: 24, background: "#fff" }).png().toBuffer();
    variants.push(crop);
  }
  variants.push(image, await sharp(image).threshold(150).png().toBuffer());
  let available = false;
  let best = null;
  for (const lang of ["ocrb_int", "eng"]) {
    try { await fs.access(path.join(workerData.tessdataDir, `${lang}.traineddata`)); }
    catch { continue; }
    available = true;
    let worker;
    try {
      worker = await createWorker(lang, 1, {
        workerPath: require.resolve("tesseract.js/src/worker-script/node/index.js"),
        langPath: workerData.tessdataDir, gzip: false, cacheMethod: "none",
        // Keep engine failures inside this isolated thread; the parent enforces a deadline.
        errorHandler: () => {},
      });
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<", preserve_interword_spaces: "1", user_defined_dpi: "300" });
      for (const variant of variants) {
        const { data } = await worker.recognize(variant);
        const parsed = findBestMrzInText(data.text);
        if (parsed && (!best || parsed.score > best.score)) best = parsed;
        if (best?.score >= 8) return best;
      }
    } finally { if (worker) await worker.terminate(); }
  }
  if (!available) throw Object.assign(new Error("Scanner language data is unavailable."), { code: "OCR_UNAVAILABLE" });
  return best;
}

scan().then((mrz) => parentPort.postMessage({ mrz })).catch((error) => {
  parentPort.postMessage({ error: { code: error.code || "OCR_FAILED", message: error.message } });
});
