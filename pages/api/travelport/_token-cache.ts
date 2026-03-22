type TokenCacheEntry = {
  token: string;
  expiresAt: number;
};

type TokenCacheStore = {
  values: Map<string, TokenCacheEntry>;
  inflight: Map<string, Promise<string>>;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getStore(): TokenCacheStore {
  const host = globalThis as typeof globalThis & {
    __flyjattTravelportTokenCache?: TokenCacheStore;
  };

  if (!host.__flyjattTravelportTokenCache) {
    host.__flyjattTravelportTokenCache = {
      values: new Map<string, TokenCacheEntry>(),
      inflight: new Map<string, Promise<string>>(),
    };
  }

  return host.__flyjattTravelportTokenCache;
}

function resolveCacheKey(): string {
  const authUrl = getRequiredEnv("TRAVELPORT_AUTH_URL");
  const clientId = getRequiredEnv("TRAVELPORT_CLIENT_ID");
  const username = getRequiredEnv("TRAVELPORT_USERNAME");
  const grantType = process.env.TRAVELPORT_AUTH_GRANT_TYPE || "password";
  const useBasicAuth = process.env.TRAVELPORT_USE_BASIC_AUTH === "true";
  return `${authUrl}|${clientId}|${username}|${grantType}|${useBasicAuth ? "basic" : "body"}`;
}

async function requestNewToken(): Promise<{ token: string; expiresInSec: number }> {
  const authUrl = getRequiredEnv("TRAVELPORT_AUTH_URL");
  const clientId = getRequiredEnv("TRAVELPORT_CLIENT_ID");
  const clientSecret = getRequiredEnv("TRAVELPORT_CLIENT_SECRET");
  const username = getRequiredEnv("TRAVELPORT_USERNAME");
  const password = getRequiredEnv("TRAVELPORT_PASSWORD");
  const grantType = process.env.TRAVELPORT_AUTH_GRANT_TYPE || "password";
  const useBasicAuth = process.env.TRAVELPORT_USE_BASIC_AUTH === "true";

  const body = new URLSearchParams();
  body.append("grant_type", grantType);
  body.append("username", username);
  body.append("password", password);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (useBasicAuth) {
    const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${basicToken}`;
  } else {
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
  }

  const response = await fetch(authUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.message ||
        `Travelport auth failed (${response.status})`
    );
  }

  const expiresInRaw = Number(payload?.expires_in);
  const expiresInSec = Number.isFinite(expiresInRaw) && expiresInRaw > 0 ? expiresInRaw : 1800;

  return {
    token: String(payload.access_token),
    expiresInSec,
  };
}

export async function getTravelportAccessToken(options?: {
  forceRefresh?: boolean;
  minTtlMs?: number;
}): Promise<string> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const minTtlMs = Number.isFinite(Number(options?.minTtlMs))
    ? Math.max(0, Number(options?.minTtlMs))
    : 60_000;
  const now = Date.now();
  const cacheKey = resolveCacheKey();
  const store = getStore();

  const cached = store.values.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt - now > minTtlMs) {
    return cached.token;
  }

  if (!forceRefresh) {
    const pending = store.inflight.get(cacheKey);
    if (pending) {
      return pending;
    }
  }

  const requestPromise = (async () => {
    const fresh = await requestNewToken();
    const expiresAt = now + fresh.expiresInSec * 1000;
    store.values.set(cacheKey, {
      token: fresh.token,
      expiresAt,
    });
    return fresh.token;
  })();

  store.inflight.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    const current = store.inflight.get(cacheKey);
    if (current === requestPromise) {
      store.inflight.delete(cacheKey);
    }
  }
}
