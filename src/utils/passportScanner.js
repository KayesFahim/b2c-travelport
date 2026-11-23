import { ApiClientError, fetchWithTimeout, readApiResponse } from "./apiClient";
export async function scanPassportImage(file) {
  if (!file) throw new ApiClientError("Choose a photo of the passport details page.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new ApiClientError("Choose a JPEG, PNG or WebP photo. Convert HEIC or PDF files before scanning.");
  if (file.size > 8 * 1024 * 1024) throw new ApiClientError("Choose an image smaller than 8 MB.");
  if (!file.size) throw new ApiClientError("The selected photo is empty. Choose another image.");
  const imageBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ApiClientError("The photo could not be read. Choose it again."));
    reader.onabort = () => reject(new ApiClientError("The photo upload was cancelled."));
    reader.readAsDataURL(file);
  });
  const response = await fetchWithTimeout("/api/passport/extract-local", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64 }) }, 100_000);
  return readApiResponse(response, "We could not scan this passport. Try a clearer photo or enter the details manually.");
}
