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

// Browser authentication uses the server's HttpOnly cookie. Clear old copies of
// bearer credentials instead of persisting session tokens in script-readable storage.
export function getBookingAuthToken() { return ""; }

export function setBookingAuthToken() {
  try {
    secureLocalStorage.removeItem(BOOKING_AUTH_TOKEN_KEY);
    if (canUseStorage()) window.localStorage.removeItem(BOOKING_AUTH_TOKEN_KEY);
  } catch { /* Storage may be disabled. */ }
}

export function getBookingAuthHeader() { return {}; }

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
  setBookingAuthToken();
  const response = await fetch("/api/auth/myaccount", {
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
  if (payload?.verificationRequired) {
    throw new Error("Account created. Please check your email for the verification link, then sign in.");
  }
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
