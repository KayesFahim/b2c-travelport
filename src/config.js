const nextPublicApiUrl =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined;
const viteApiUrl =
  typeof process !== "undefined" ? process.env.VITE_API_URL : undefined;
const nextPublicGoogleClientId =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    : undefined;
const viteGoogleClientId =
  typeof process !== "undefined" ? process.env.VITE_GOOGLE_CLIENT_ID : undefined;

export const config = {
  baseUrl: nextPublicApiUrl || viteApiUrl || "",
  googleClientId: nextPublicGoogleClientId || viteGoogleClientId || "",
};
