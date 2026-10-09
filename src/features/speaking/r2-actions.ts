"use server";

import { generateUploadUrl, r2Client } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
export async function getR2UploadUrlAction(contentType: string) {
  // Xác thực user
  const { requireCompletedOnboarding } = await import("@/features/onboarding/server/learner-profile");
  const { account } = await requireCompletedOnboarding();
  const userId = account.user.id;

  // Validate định dạng cơ bản trên Server
  const validContentTypes = ["audio/webm", "audio/mp4", "audio/mp3", "audio/wav", "audio/mpeg"];
  if (!validContentTypes.includes(contentType)) {
    return { status: "error" as const, message: "Định dạng audio không được hỗ trợ." };
  }

  // Tạo Key duy nhất cho file
  const fileKey = `speaking/${userId}/${Date.now()}-${randomUUID()}.webm`;

  try {
    const uploadUrl = await generateUploadUrl(fileKey, contentType);
    return { 
      status: "success" as const, 
      uploadUrl,
      fileKey
    };
  } catch (error) {
    console.error("Lỗi khi tạo Presigned URL R2:", error);
    return { status: "error" as const, message: "Không thể khởi tạo đường dẫn upload R2." };
  }
}

/**
 * Lưu thông tin Audio đã upload lên R2 vào Cơ sở dữ liệu
 */
export async function saveR2AudioAction(
  attemptId: string,
  promptId: string,
  fileKey: string,
  mimeType: string,
  sizeBytes: number,
  durationSeconds: number
) {
  const { requireCompletedOnboarding } = await import("@/features/onboarding/server/learner-profile");
  const { account } = await requireCompletedOnboarding();
  const supabase = await import("@/lib/supabase/server").then(m => m.createSupabaseServerClient());

  // @ts-expect-error: Next.js types haven't been regenerated to include finalize_r2_speaking_upload
  const { data, error } = await supabase.rpc("finalize_r2_speaking_upload", {
    p_attempt_id: attemptId,
    p_prompt_id: promptId,
    p_storage_path: fileKey,
    p_mime_type: mimeType,
    p_size_bytes: sizeBytes,
    p_duration_seconds: durationSeconds,
  });

  if (error) {
    console.error("Lỗi khi lưu audio R2 vào DB:", error);
    return { status: "error" as const, message: "Lỗi kết nối CSDL, không thể nộp bài." };
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/practice/speaking");

  return { status: "success" as const };
}

/**
 * Fallback Upload Audio thông qua Server Action nếu Trình duyệt bị lỗi CORS khi upload trực tiếp lên R2
 */
export async function uploadR2AudioFallbackAction(formData: FormData) {
  const { requireCompletedOnboarding } = await import("@/features/onboarding/server/learner-profile");
  const { account } = await requireCompletedOnboarding();
  const userId = account.user.id;

  const file = formData.get("file") as File | null;
  const attemptId = formData.get("attemptId") as string;
  const promptId = formData.get("promptId") as string;
  const mimeType = (formData.get("mimeType") as string) || "audio/webm";
  const durationSeconds = Number(formData.get("duration") || 0);

  if (!file || !attemptId || !promptId) {
    return { status: "error" as const, message: "Dữ liệu audio không hợp lệ." };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileKey = `speaking/${userId}/${Date.now()}-${randomUUID()}.webm`;

  try {
    const bucketName = process.env.R2_BUCKET_NAME!;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    return await saveR2AudioAction(
      attemptId,
      promptId,
      fileKey,
      mimeType,
      file.size,
      durationSeconds
    );
  } catch (err) {
    console.error("Lỗi fallback upload R2 qua Server:", err);
    return { status: "error" as const, message: "Không thể upload audio qua server fallback." };
  }
}

