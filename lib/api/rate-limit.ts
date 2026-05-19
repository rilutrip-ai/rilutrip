import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const resolvePlacesPerMinute = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:resolve-places:min",
  analytics: true,
});

export const resolvePlacesPerDay = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(50, "1 d"),
  prefix: "rl:resolve-places:day",
  analytics: true,
});

export function extractUserIdFromJwt(authHeader: string): string | null {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

type LimitResult = Awaited<ReturnType<Ratelimit["limit"]>>;

export function rateLimitResponse(result: LimitResult): Response {
  return new Response(JSON.stringify({ error: "Rate limit exceeded", code: "RATE_LIMIT" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
      "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
    },
  });
}
