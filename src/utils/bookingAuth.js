function resolveMessage(payload, fallback) {
  return (
    payload?.message ||
    payload?.details ||
    payload?.error ||
    fallback ||
    "Request failed"
  );
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
  return payload?.user || null;
}

export async function logoutBookingUser() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  await parseApiResponse(response, "Logout failed");
}
