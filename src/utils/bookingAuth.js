import secureLocalStorage from "react-secure-storage";

function resolveMessage(payload, fallback) {
  return (
    payload?.message ||
    payload?.details ||
    payload?.error ||
    fallback ||
    "Request failed"
  );
}

const BOOKING_AUTH_TOKEN_KEY = "flyjatt_booking_auth_token";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSecureToken() {
  try {
    const value = secureLocalStorage.getItem(BOOKING_AUTH_TOKEN_KEY);
    return String(value || "").trim();
  } catch {
    return "";
  }
}

function writeSecureToken(token) {
  try {
    if (!token) {
      secureLocalStorage.removeItem(BOOKING_AUTH_TOKEN_KEY);
      return;
    }
    secureLocalStorage.setItem(BOOKING_AUTH_TOKEN_KEY, token);
  } catch {
    // no-op
  }
}

export function getBookingAuthToken() {
  const secureToken = readSecureToken();
  if (secureToken) return secureToken;

  if (!canUseStorage()) return "";
  const legacyToken = String(window.localStorage.getItem(BOOKING_AUTH_TOKEN_KEY) || "").trim();
  if (legacyToken) {
    writeSecureToken(legacyToken);
  }
  return legacyToken;
}

export function setBookingAuthToken(token) {
  const normalized = String(token || "").trim();
  writeSecureToken(normalized);

  if (!canUseStorage()) return;
  if (!normalized) {
    window.localStorage.removeItem(BOOKING_AUTH_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(BOOKING_AUTH_TOKEN_KEY, normalized);
}

export function getBookingAuthHeader() {
  const token = getBookingAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseApiResponse(response, fallbackErrorMessage) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    const error = new Error(resolveMessage(payload, fallbackErrorMessage));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function fetchBookingAuthMe() {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
    headers: {
      ...getBookingAuthHeader(),
    },
  });

  if (response.status === 401) return null;
  const payload = await parseApiResponse(response, "Unable to load login session.");
  return payload?.user || null;
}

export async function loginBookingUser({ email, password }) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  const payload = await parseApiResponse(response, "Login failed");
  if (payload?.token) {
    setBookingAuthToken(payload.token);
  }
  return payload?.user || null;
}

export async function registerBookingUser({ name, email, password }) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });
  const payload = await parseApiResponse(response, "Registration failed");
  if (payload?.token) {
    setBookingAuthToken(payload.token);
  }
  return payload?.user || null;
}

export async function logoutBookingUser() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: {
      ...getBookingAuthHeader(),
    },
  });
  await parseApiResponse(response, "Logout failed");
  setBookingAuthToken("");
}
