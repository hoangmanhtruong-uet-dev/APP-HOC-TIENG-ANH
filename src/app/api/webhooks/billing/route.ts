import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || req.headers.get("stripe-signature") || "";
    const secret = process.env.BILLING_WEBHOOK_SECRET || "";

    if (secret && signature) {
      const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
      const sigBuffer = Buffer.from(signature, "hex");
      const compBuffer = Buffer.from(computed, "hex");

      if (
        sigBuffer.length !== compBuffer.length ||
        !timingSafeEqual(sigBuffer, compBuffer)
      ) {
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 },
        );
      }
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.id || payload.transaction_id || req.headers.get("x-event-id");
    const gateway = payload.gateway || "sepay";

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing event identifier" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Idempotency check using billing_events table
    const { data: existing } = await supabaseAdmin
      .from("billing_events")
      .select("id, processed_at")
      .eq("gateway", gateway)
      .eq("gateway_event_id", String(eventId))
      .maybeSingle();

    if (existing?.processed_at) {
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    // Insert billing event
    if (!existing) {
      await supabaseAdmin.from("billing_events").insert({
        gateway,
        gateway_event_id: String(eventId),
        event_type: payload.event || "payment_success",
        payload,
      });
    }

    const userId = payload.userId || payload.metadata?.userId;
    if (userId) {
      // Activate Pro Subscription for User
      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          tier: "pro",
          status: "active",
          payment_gateway: gateway,
          gateway_subscription_id: String(eventId),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    // Mark billing event processed
    await supabaseAdmin
      .from("billing_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("gateway", gateway)
      .eq("gateway_event_id", String(eventId));

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Webhook handler error" },
      { status: 500 },
    );
  }
}
