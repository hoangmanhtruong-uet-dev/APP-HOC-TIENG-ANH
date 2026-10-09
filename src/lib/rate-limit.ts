import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash is configured, if not use a dummy redis to prevent crashes in dev
const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? Redis.fromEnv() 
  : ({
      sadd: async () => {},
      eval: async () => [0, 0, 0, 0],
    } as any);

export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
});

export const userFreeDailyQuota = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "1 d"),
  analytics: true,
});

// P0.2: Rate limiter for saving practice drafts (30 reqs / min / user)
export const saveDraftRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
});

// P0.2: Rate limiter for submitting practice attempts (5 reqs / min / user)
export const submitAttemptRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
});

// touched for audit
