import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logServerEvent } from "@/server/observability/logger";

const importSchema = z.object({
  jobType: z.enum(["import_reading_test", "import_grammar_exercises", "import_vocabulary"]),
  fileUrl: z.string().url(),
  authorId: z.string().uuid(),
});

export async function POST(request: Request) {
  const reqId = request.headers.get("x-request-id") || crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = importSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { jobType, fileUrl, authorId } = parsed.data;
    const supabaseAdmin = createSupabaseAdminClient();

    // 1. Create a bulk import job record
    const { data: job, error: insertError } = await (supabaseAdmin as any)
      .from("bulk_import_jobs")
      .insert({
        author_id: authorId,
        job_type: jobType,
        file_url: fileUrl,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      logServerEvent("error", {
        event: "cms.import_job_creation_failed",
        requestId: reqId,
        route: "/api/cms/import",
        stage: "db_insert",
        error: insertError.message,
      });
      return NextResponse.json({ error: "Failed to create import job" }, { status: 500 });
    }

    logServerEvent("info", {
      event: "cms.import_job_created",
      requestId: reqId,
      route: "/api/cms/import",
      stage: "start",
      metadata: { jobId: job.id, jobType },
    });

    // In a real application, you would trigger a background worker here
    // e.g., using Inngest, Upstash QStash, or a Supabase pg_net webhook call to an Edge Function

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error: any) {
    logServerEvent("error", {
      event: "cms.import_job_crash",
      requestId: reqId,
      route: "/api/cms/import",
      stage: "handler",
      error: error.message,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
