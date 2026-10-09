import { z } from "zod";

export const subscriptionTierSchema = z.enum(["free", "pro"]);
export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);

export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tier: subscriptionTierSchema,
  status: subscriptionStatusSchema,
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  paymentGateway: z.string().nullable(),
  gatewayCustomerId: z.string().nullable(),
  gatewaySubscriptionId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const userQuotaSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  quotaType: z.enum(["ai_writing", "ai_speaking", "mock_test", "vocab_daily"]),
  quotaLimit: z.number().int().nonnegative(),
  quotaUsed: z.number().int().nonnegative(),
  resetAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserQuota = z.infer<typeof userQuotaSchema>;

// SePay Webhook payload schema example (can be adapted for Stripe)
export const sepayWebhookSchema = z.object({
  gateway: z.literal("sepay"),
  transactionDate: z.string(),
  accountNumber: z.string(),
  subAccount: z.string().nullable().optional(),
  amountIn: z.number(),
  amountOut: z.number(),
  accumulated: z.number(),
  transactionContent: z.string(),
  referenceNumber: z.string(),
  code: z.string().nullable().optional(),
});
