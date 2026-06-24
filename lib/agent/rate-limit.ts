/**
 * Lightweight in-memory rate limiter for the portfolio demo.
 *
 * Two layers:
 *   1. Per-IP: a small number of runs per IP per hour, to prevent any single
 *      visitor from burning through the demo quota.
 *   2. Global daily: a soft cap across all users per UTC day, to stay well
 *      under the Groq free-tier limits.
 *
 * State is in-memory and resets when the Vercel function instance recycles
 * (~15 min idle). For a public demo this is the right trade-off — generous
 * enough to feel unlimited to a real visitor, but bounded enough that a
 * spike can't drain the quota.
 *
 * Production would use Upstash Redis or Vercel KV for shared state across
 * function instances; that's out of scope for the demo.
 */

type Bucket = {
  hits: number;
  windowStart: number;
};

const PER_IP_LIMIT = 5;                  // runs per IP per window
const PER_IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const GLOBAL_DAILY_LIMIT = 200;          // total runs per UTC day

const perIpBuckets = new Map<string, Bucket>();

let globalDayHits = 0;
let globalDayKey = "";

function currentDayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "per_ip" | "global_daily";
      retryAfterSec: number;
      message: string;
    };

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const dayKey = currentDayKey();

  // Reset global counter on UTC day boundary
  if (dayKey !== globalDayKey) {
    globalDayHits = 0;
    globalDayKey = dayKey;
  }

  // Global daily cap
  if (globalDayHits >= GLOBAL_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "global_daily",
      retryAfterSec: secondsUntilNextUtcDay(),
      message:
        "Daily demo limit reached. The live demo runs on a free-tier LLM quota — please try again tomorrow, or clone the repo and run locally with your own free Groq key (see README).",
    };
  }

  // Per-IP window
  const bucket = perIpBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > PER_IP_WINDOW_MS) {
    perIpBuckets.set(ip, { hits: 1, windowStart: now });
    globalDayHits += 1;
    return { allowed: true };
  }

  if (bucket.hits >= PER_IP_LIMIT) {
    const retryAfterSec = Math.ceil(
      (bucket.windowStart + PER_IP_WINDOW_MS - now) / 1000
    );
    return {
      allowed: false,
      reason: "per_ip",
      retryAfterSec,
      message: `Rate limit reached: ${PER_IP_LIMIT} runs per hour. The live demo runs on a free-tier LLM quota — try again in ${Math.ceil(
        retryAfterSec / 60
      )} minute(s), or clone the repo and run locally (see README).`,
    };
  }

  bucket.hits += 1;
  globalDayHits += 1;
  return { allowed: true };
}

function secondsUntilNextUtcDay(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return Math.ceil((next.getTime() - now.getTime()) / 1000);
}

/**
 * Extracts the client IP from request headers. Vercel sets x-forwarded-for
 * and x-real-ip; we fall back to a placeholder so local dev still works.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "local";
}