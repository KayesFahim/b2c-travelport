import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";
import { createWorker, PSM } from "tesseract.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

type ExtractResponse = {
  success: boolean;
  source: string;
  message?: string;
  extractedData?: Record<string, unknown>;
  mrz?: string;
  mrzLines?: string[];
  ocrText?: string;
};

type MrzParsed = {
  line1: string;
  line2: string;
  score: number;
  data: {
    firstName: string;
    givenNames: string;
    lastName: string;
    passportNumber: string;
    passportNo: string;
    nationality: string;
    passportIssuingCountry: string;
    issuingCountry: string;
    gender: string;
    dateOfBirth: string;
    dob: string;
    passportExpiryDate: string;
    passportexp: string;
  };
};

type OcrVariant = {
  label: string;
  buffer: Buffer;
  psm: PSM;
};

const SOURCE_NAME = "local-sharp-tesseract-mrz";
const require = createRequire(import.meta.url);
const TESSDATA_DIR =
  process.env.PASSPORT_TESSDATA_PATH || path.join(process.cwd(), "tessdata");
const TESSERACT_CORE_DIR = path.dirname(
  require.resolve("tesseract.js-core/package.json")
);
const TESSERACT_WORKER_PATH = require.resolve("tesseract.js/dist/worker.min.js");
const TESSERACT_CORE_PATH = path.join(TESSERACT_CORE_DIR, "tesseract-core.wasm.js");
const MRZ_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";
const OCR_LANG_PREFERENCE = ["ocrb_int", "eng"];
const OCR_TIMEOUT_MS = Math.max(
  10000,
  Number(process.env.PASSPORT_OCR_TIMEOUT_MS || 55000)
);

const toDataBuffer = (imageBase64: string): Buffer | null => {
  if (!imageBase64) return null;
  const base64 = imageBase64.includes(",")
    ? imageBase64.split(",").slice(1).join(",")
    : imageBase64;
  try {
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
};

const fetchBufferFromUrl = async (url: string): Promise<Buffer | null> => {
  if (!url || typeof url !== "string") return null;
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
};

const parseMrzDate = (value: string, type: "dob" | "expiry"): string => {
  const raw = (value || "").replace(/[^0-9]/g, "");
  if (!/^\d{6}$/.test(raw)) return "";

  const yy = Number(raw.slice(0, 2));
  const mm = Number(raw.slice(2, 4));
  const dd = Number(raw.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";

  const nowYear = new Date().getFullYear();
  let fullYear = 2000 + yy;
  if (type === "dob" && fullYear > nowYear) fullYear -= 100;
  if (type === "expiry" && fullYear > nowYear + 25) fullYear -= 100;

  return `${fullYear.toString().padStart(4, "0")}-${String(mm).padStart(
    2,
    "0"
  )}-${String(dd).padStart(2, "0")}`;
};

const normalizeMrzLine = (line: string): string =>
  (line || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9<]/g, "");

const normalizeNumericZone = (value: string): string =>
  (value || "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/Q/g, "0")
    .replace(/D/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/Z/g, "2")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/G/g, "6");

const normalizeCheckDigit = (value: string): string =>
  normalizeNumericZone(value).replace(/[^0-9]/g, "").slice(0, 1);

const normalizeAlphaZone = (value: string): string =>
  String(value || "")
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/2/g, "Z")
    .replace(/6/g, "G")
    .replace(/8/g, "B")
    .replace(/[^A-Z]/g, "");

const normalizeDocumentNumber = (value: string): string =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, "")
    .replace(/</g, "")
    .trim();

const mrzCharValue = (char: string): number => {
  if (!char || char === "<") return 0;
  if (/^[0-9]$/.test(char)) return Number(char);
  if (/^[A-Z]$/.test(char)) return char.charCodeAt(0) - 55;
  return 0;
};

const mrzCheckDigit = (field: string): string => {
  const weights = [7, 3, 1];
  const chars = String(field || "").toUpperCase().split("");
  const total = chars.reduce((sum, char, index) => {
    return sum + mrzCharValue(char) * weights[index % 3];
  }, 0);
  return String(total % 10);
};

const scoreMrzLine2 = (line2: string): number => {
  let score = 0;

  const passportField = line2.slice(0, 9);
  const passportCheck = normalizeCheckDigit(line2.slice(9, 10));
  if (passportCheck && mrzCheckDigit(passportField) === passportCheck) score += 1;

  const dobField = normalizeNumericZone(line2.slice(13, 19));
  const dobCheck = normalizeCheckDigit(line2.slice(19, 20));
  if (dobCheck && mrzCheckDigit(dobField) === dobCheck) score += 1;

  const expiryField = normalizeNumericZone(line2.slice(21, 27));
  const expiryCheck = normalizeCheckDigit(line2.slice(27, 28));
  if (expiryCheck && mrzCheckDigit(expiryField) === expiryCheck) score += 1;

  const compositeField = `${line2.slice(0, 10)}${line2.slice(13, 20)}${line2.slice(
    21,
    43
  )}`;
  const finalCheck = normalizeCheckDigit(line2.slice(43, 44));
  if (finalCheck && mrzCheckDigit(compositeField) === finalCheck) score += 1;

  return score;
};

const parseMrzPair = (line1Raw: string, line2Raw: string): MrzParsed | null => {
  let line1 = normalizeMrzLine(line1Raw);
  let line2 = normalizeMrzLine(line2Raw);

  if (line1.length < 40 || line2.length < 40) return null;
  line1 = (line1 + "<".repeat(44)).slice(0, 44);
  line2 = (line2 + "<".repeat(44)).slice(0, 44);
  if (!line1.startsWith("P<")) return null;

  const issuer = normalizeAlphaZone(line1.slice(2, 5)).slice(0, 3);
  const namesField = line1.slice(5);
  const [surnamePart = "", givenPart = ""] = namesField.split("<<");
  const lastName = surnamePart.replace(/</g, " ").replace(/\s+/g, " ").trim();
  const givenNames = givenPart.replace(/</g, " ").replace(/\s+/g, " ").trim();
  const firstName = givenNames || "";

  const passportNumber = normalizeDocumentNumber(line2.slice(0, 9));
  const nationality = normalizeAlphaZone(line2.slice(10, 13)).slice(0, 3);
  const dob = parseMrzDate(normalizeNumericZone(line2.slice(13, 19)), "dob");
  const sex = line2.slice(20, 21);
  const expiry = parseMrzDate(normalizeNumericZone(line2.slice(21, 27)), "expiry");

  let score = 0;
  if (issuer.length === 3) score += 1;
  if (nationality.length === 3) score += 1;
  if (passportNumber.length >= 6) score += 1;
  if (dob) score += 1;
  if (expiry) score += 1;
  score += scoreMrzLine2(line2);

  return {
    line1,
    line2,
    score,
    data: {
      firstName,
      givenNames,
      lastName,
      passportNumber,
      passportNo: passportNumber,
      nationality,
      passportIssuingCountry: issuer || nationality,
      issuingCountry: issuer || nationality,
      gender: sex === "F" ? "Female" : sex === "M" ? "Male" : "",
      dateOfBirth: dob,
      dob,
      passportExpiryDate: expiry,
      passportexp: expiry,
    },
  };
};

const findBestMrzInText = (text: string): MrzParsed | null => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => normalizeMrzLine(line))
    .filter(Boolean);

  const seen = new Set<string>();
  const candidates: MrzParsed[] = [];

  const pushCandidate = (line1: string, line2: string) => {
    const key = `${line1}__${line2}`;
    if (seen.has(key)) return;
    seen.add(key);
    const parsed = parseMrzPair(line1, line2);
    if (parsed) candidates.push(parsed);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1] || "";

    // Look for P< at the start OR embedded within OCR noise before the zone
    const pIdx = line.startsWith("P<") ? 0 : line.indexOf("P<");
    if (pIdx >= 0) {
      const candidate = pIdx === 0 ? line : line.slice(pIdx);
      if (next) pushCandidate(candidate, next);

      if (candidate.length >= 88) {
        pushCandidate(candidate.slice(0, 44), candidate.slice(44, 88));
      }

      const compact = candidate.replace(/[^A-Z0-9<]/g, "");
      if (compact.length >= 88 && compact.startsWith("P<")) {
        pushCandidate(compact.slice(0, 44), compact.slice(44, 88));
      }
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.score >= 3 ? candidates[0] : null;
};

const preprocessForOcr = async (sourceBuffer: Buffer): Promise<OcrVariant[]> => {
  const base = sharp(sourceBuffer, { failOnError: false }).rotate();
  const meta = await base.metadata();
  const sourceWidth = meta.width || 1400;

  const resizedBuffer = await base
    .resize({
      width: sourceWidth > 1800 ? 1800 : 1400,
      fit: "inside",
      withoutEnlargement: false,
    })
    .toBuffer();

  const resizedMeta = await sharp(resizedBuffer).metadata();
  const width = resizedMeta.width || 0;
  const height = resizedMeta.height || 0;

  const fullGray = await sharp(resizedBuffer)
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.2 })
    .toFormat("png")
    .toBuffer();

  const fullBinary = await sharp(fullGray)
    .linear(1.35, -20)
    .threshold(145)
    .toFormat("png")
    .toBuffer();

  const variants: OcrVariant[] = [
    { label: "full-gray", buffer: fullGray, psm: PSM.SINGLE_BLOCK },
    { label: "full-binary", buffer: fullBinary, psm: PSM.SINGLE_BLOCK },
  ];

  if (width > 0 && height > 0) {
    const top = Math.max(Math.floor(height * 0.58), 0);
    const cropHeight = Math.max(height - top, 1);

    const mrzGray = await sharp(fullGray)
      .extract({ left: 0, top, width, height: cropHeight })
      .toFormat("png")
      .toBuffer();

    const mrzBinary = await sharp(mrzGray)
      .linear(1.4, -22)
      .threshold(148)
      .toFormat("png")
      .toBuffer();

    // Tight MRZ strip: bottom 22% upscaled 2x — best for OCR-B font on passport data page
    const stripTop = Math.max(Math.floor(height * 0.78), 0);
    const stripHeight = Math.max(height - stripTop, 20);
    const mrzStripRaw = await sharp(fullGray)
      .extract({ left: 0, top: stripTop, width, height: stripHeight })
      .resize({ width: Math.min(width * 2, 3600), fit: "inside", withoutEnlargement: false })
      .sharpen({ sigma: 0.8 })
      .toFormat("png")
      .toBuffer();
    const mrzStripBinary = await sharp(mrzStripRaw)
      .linear(1.5, -25)
      .threshold(140)
      .toFormat("png")
      .toBuffer();

    variants.unshift(
      { label: "mrz-strip-binary", buffer: mrzStripBinary, psm: PSM.SINGLE_BLOCK },
      { label: "mrz-strip-gray", buffer: mrzStripRaw, psm: PSM.SINGLE_BLOCK },
      { label: "mrz-binary-psm7", buffer: mrzBinary, psm: PSM.SINGLE_LINE },
      { label: "mrz-binary-psm6", buffer: mrzBinary, psm: PSM.SINGLE_BLOCK },
      { label: "mrz-gray", buffer: mrzGray, psm: PSM.SINGLE_BLOCK }
    );
  }

  return variants;
};

const fileExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const getAvailableLocalLangs = async (): Promise<string[]> => {
  const available: string[] = [];

  for (const lang of OCR_LANG_PREFERENCE) {
    const filePath = path.join(TESSDATA_DIR, `${lang}.traineddata`);
    if (await fileExists(filePath)) {
      available.push(lang);
    }
  }

  return available;
};

const runOcr = async (
  imageBuffer: Buffer,
  lang: string,
  psm: PSM,
  useLocalTessdata: boolean
): Promise<string> => {
  const worker = await createWorker(lang, 1, {
    corePath: TESSERACT_CORE_PATH,
    workerPath: TESSERACT_WORKER_PATH,
    ...(useLocalTessdata
      ? {
        langPath: TESSDATA_DIR,
        gzip: false,
        cacheMethod: "none",
      }
      : {}),
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      tessedit_char_whitelist: MRZ_WHITELIST,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });

    const { data } = await worker.recognize(imageBuffer);
    return data?.text || "";
  } finally {
    await worker.terminate();
  }
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`OCR timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const extractMrz = async (
  inputBuffer: Buffer
): Promise<{ mrz: MrzParsed | null; rawTextLog: string }> => {
  const variants = await preprocessForOcr(inputBuffer);
  const localLangs = await getAvailableLocalLangs();
  const useLocalTessdata = localLangs.length > 0;
  const langs = useLocalTessdata ? localLangs : ["eng"];

  const rawTextParts: string[] = [];
  let best: MrzParsed | null = null;

  for (const lang of langs) {
    for (const variant of variants) {
      const text = await runOcr(variant.buffer, lang, variant.psm, useLocalTessdata);
      const trimmed = String(text || "").trim();

      if (trimmed) {
        rawTextParts.push(`[${lang}:${variant.label}]\n${trimmed}`);
      }

      const parsed = findBestMrzInText(trimmed);
      if (parsed && (!best || parsed.score > best.score)) {
        best = parsed;
      }

      if (best && best.score >= 7) {
        return {
          mrz: best,
          rawTextLog: rawTextParts.join("\n\n"),
        };
      }
    }
  }

  return {
    mrz: best,
    rawTextLog: rawTextParts.join("\n\n"),
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExtractResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      source: SOURCE_NAME,
      message: "Method not allowed",
    });
  }

  const imageBase64 = String(req.body?.imageBase64 || "");
  const fileUrl = String(req.body?.fileUrl || req.body?.passportUrl || "");

  const directBuffer = toDataBuffer(imageBase64);
  const urlBuffer = directBuffer ? null : await fetchBufferFromUrl(fileUrl);
  const inputBuffer = directBuffer || urlBuffer;

  if (!inputBuffer) {
    return res.status(400).json({
      success: false,
      source: SOURCE_NAME,
      message: "Missing valid imageBase64 or fileUrl in request body.",
    });
  }

  try {
    const { mrz, rawTextLog } = await withTimeout(
      extractMrz(inputBuffer),
      OCR_TIMEOUT_MS
    );

    if (!mrz) {
      return res.status(200).json({
        success: false,
        source: SOURCE_NAME,
        message:
          "OCR completed but MRZ lines were not detected. Use clear photo with full MRZ lines visible.",
        ocrText: rawTextLog,
      });
    }

    return res.status(200).json({
      success: true,
      source: SOURCE_NAME,
      extractedData: mrz.data,
      mrz: `${mrz.line1}\n${mrz.line2}`,
      mrzLines: [mrz.line1, mrz.line2],
      ocrText: rawTextLog,
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      source: SOURCE_NAME,
      message: "Local OCR extraction failed.",
      ocrText: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
