import Redis from "ioredis";

type MemoryValue = {
  value: string;
  expiresAt: number | null;
};

const memoryStore = new Map<string, MemoryValue>();

function cleanupExpiredMemory(now = Date.now()) {
  for (const [key, row] of memoryStore.entries()) {
    if (row.expiresAt !== null && row.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

function getMemoryValue(key: string): string | null {
  cleanupExpiredMemory();
  const row = memoryStore.get(key);
  if (!row) return null;
  return row.value;
}

function setMemoryValue(key: string, value: string, ttlSec?: number) {
  const expiresAt =
    Number.isFinite(Number(ttlSec)) && Number(ttlSec) > 0
      ? Date.now() + Number(ttlSec) * 1000
      : null;
  memoryStore.set(key, { value, expiresAt });
}

function deleteMemoryValue(key: string) {
  memoryStore.delete(key);
}

function incrementMemoryValue(key: string, ttlSec?: number): number {
  const current = Number(getMemoryValue(key) ?? "0");
  const next = Number.isFinite(current) ? current + 1 : 1;
  setMemoryValue(key, String(next), ttlSec);
  return next;
}

type RedisHost = typeof globalThis & {
  __flyjattRedisClient?: Redis | null;
  __flyjattRedisUnavailable?: boolean;
};

async function getRedisClient(): Promise<Redis | null> {
  const redisUrl = String(process.env.REDIS_URL || "").trim();
  if (!redisUrl) return null;

  // On Vercel, localhost Redis is unavailable; fall back to in-memory cache.
  const isVercel = process.env.VERCEL === "1";
  if (isVercel && /127\.0\.0\.1|localhost/.test(redisUrl)) {
    return null;
  }

  const host = globalThis as RedisHost;
  if (host.__flyjattRedisUnavailable) return null;
  if (host.__flyjattRedisClient && host.__flyjattRedisClient.status === "ready") {
    return host.__flyjattRedisClient;
  }

  if (!host.__flyjattRedisClient) {
    host.__flyjattRedisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1500,
    });
    // Prevent noisy unhandled ioredis error events in serverless logs.
    host.__flyjattRedisClient.on("error", () => {
      host.__flyjattRedisUnavailable = true;
    });
  }

  try {
    if (host.__flyjattRedisClient.status !== "ready") {
      await host.__flyjattRedisClient.connect();
    }
    return host.__flyjattRedisClient;
  } catch {
    host.__flyjattRedisUnavailable = true;
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return getMemoryValue(key);
  try {
    return await client.get(key);
  } catch {
    return getMemoryValue(key);
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    setMemoryValue(key, value, ttlSeconds);
    return;
  }
  try {
    if (Number.isFinite(Number(ttlSeconds)) && Number(ttlSeconds) > 0) {
      await client.set(key, value, "EX", Number(ttlSeconds));
    } else {
      await client.set(key, value);
    }
  } catch {
    setMemoryValue(key, value, ttlSeconds);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    deleteMemoryValue(key);
    return;
  }
  try {
    await client.del(key);
  } catch {
    deleteMemoryValue(key);
  }
}

export async function cacheIncr(key: string, ttlSeconds?: number): Promise<number> {
  const client = await getRedisClient();
  if (!client) {
    return incrementMemoryValue(key, ttlSeconds);
  }
  try {
    const nextValue = await client.incr(key);
    if (Number.isFinite(Number(ttlSeconds)) && Number(ttlSeconds) > 0 && nextValue === 1) {
      await client.expire(key, Number(ttlSeconds));
    }
    return nextValue;
  } catch {
    return incrementMemoryValue(key, ttlSeconds);
  }
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}
