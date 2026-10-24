import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Kiểm tra xem Upstash Redis có thông tin thật hay đang để giá trị dummy
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || "";
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";

const isUpstashConfigured =
  Boolean(upstashUrl) &&
  !upstashUrl.includes("dummy") &&
  Boolean(upstashToken) &&
  !upstashToken.includes("dummy");

// Mock limiter dùng cho local dev khi chưa có Upstash thật:
// Trả về success: true ngay lập tức, không gây treo DNS hay lỗi ENOTFOUND
function createMockLimiter(): Ratelimit {
  return {
    limit: async () => ({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    }),
  } as unknown as Ratelimit;
}

const realRedis = isUpstashConfigured
  ? new Redis({
      url: upstashUrl,
      token: upstashToken,
    })
  : null;

export const ipRateLimit: Ratelimit = realRedis
  ? new Ratelimit({
      redis: realRedis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
    })
  : createMockLimiter();

export const userFreeDailyQuota: Ratelimit = realRedis
  ? new Ratelimit({
      redis: realRedis,
      limiter: Ratelimit.slidingWindow(2, "1 d"),
      analytics: true,
    })
  : createMockLimiter();

// P0.2: Rate limiter for saving practice drafts (30 reqs / min / user)
export const saveDraftRateLimit: Ratelimit = realRedis
  ? new Ratelimit({
      redis: realRedis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
    })
  : createMockLimiter();

// P0.2: Rate limiter for submitting practice attempts (5 reqs / min / user)
export const submitAttemptRateLimit: Ratelimit = realRedis
  ? new Ratelimit({
      redis: realRedis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    })
  : createMockLimiter();
