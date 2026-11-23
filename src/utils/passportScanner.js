import secureLocalStorage from "react-secure-storage";
import { ApiClientError, fetchWithTimeout, readApiResponse } from "./apiClient";
import { getBookingAuthToken } from "./bookingAuth";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const COMPRESS_THRESHOLD_BYTES = 2.5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(new ApiClientError("The photo could not be read. Choose it again."));
    reader.onabort = () =>
      reject(new ApiClientError("The photo upload was cancelled."));
    reader.readAsDataURL(file);
  });
}

async function preparePassportDataUrl(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  if (typeof window === "undefined" || file.size <= COMPRESS_THRESHOLD_BYTES) {
    return rawDataUrl;
  }

  // Downscale huge mobile camera photos cleanly to <= 2000px wide JPEG for fast, reliable MRZ OCR
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxWidth = 2000;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export async function scanPassportImage(file) {
  if (!file) {
    throw new ApiClientError("Choose a photo of the passport details page.");
  }
  const mime = String(file.type || "").toLowerCase();
  if (mime && !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime)) {
    throw new ApiClientError(
      "Choose a JPEG, PNG or WebP photo. Convert HEIC or PDF files before scanning."
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiClientError("Choose an image smaller than 8 MB.");
  }
  if (!file.size) {
    throw new ApiClientError("The selected photo is empty. Choose another image.");
  }

  const imageBase64 = await preparePassportDataUrl(file);
  const token = String(
    getBookingAuthToken?.() || secureLocalStorage.getItem("access_token") || ""
  ).trim();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetchWithTimeout(
    "/api/passport/extract-local",
    {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ imageBase64 }),
    },
    100_000
  );
  return readApiResponse(
    response,
    "We could not scan this passport. Try a clearer photo or enter the details manually."
  );
}
