import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";


import { parseWebmDurationSeconds } from "@/features/speaking/server/webm-duration";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export type VerifiedSpeakingAudio = {
  mimeType: "audio/webm" | "audio/mp4" | "audio/mpeg";
  sizeBytes: number;
  durationSeconds: number;
  sha256Checksum: string;
};

export function getSpeakingPipelineSigningSecret() {
  const value = process.env.SPEAKING_PIPELINE_SIGNING_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

export async function verifySpeakingAudio(
  blob: Blob,
  expectedMimeType: string,
): Promise<VerifiedSpeakingAudio> {
  if (blob.size < 1 || blob.size > MAX_AUDIO_BYTES) {
    throw new Error("invalid_audio_size");
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mimeType = detectMimeType(bytes);
  if (!mimeType || mimeType !== expectedMimeType) {
    throw new Error("invalid_audio_signature");
  }

  // Use API route to parse duration to avoid bundling music-metadata in Server Actions
  const formData = new FormData();
  formData.append("file", blob);
  
  // Note: ensure NEXT_PUBLIC_APP_URL is set or use relative URL if client-side
  // Since this is server-side, we must provide absolute URL. 
  // We'll fallback to a basic parse or WebM duration if fetch fails.
  let duration = 0;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/media/duration`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      duration = data.durationSeconds;
    }
  } catch (err) {
    console.error("Failed to fetch duration API:", err);
  }

  // Fallback to webm basic parse if API fails
  if (!duration && mimeType === "audio/webm") {
    duration = parseWebmDurationSeconds(bytes) || 0;
  }

  if (
    !duration ||
    !Number.isFinite(duration) ||
    duration < 1 ||
    duration > 180
  ) {
    throw new Error("invalid_audio_duration");
  }
  return {
    mimeType,
    sizeBytes: bytes.byteLength,
    durationSeconds: Math.round(duration * 1000) / 1000,
    sha256Checksum: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function createSpeakingSignature(
  secret: string,
  values: Array<string | number>,
) {
  return createHmac("sha256", secret).update(values.join("|")).digest("hex");
}

export function signaturesMatch(first: string, second: string) {
  const a = Buffer.from(first, "hex");
  const b = Buffer.from(second, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function detectMimeType(
  bytes: Uint8Array,
): VerifiedSpeakingAudio["mimeType"] | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "audio/webm";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
  ) {
    return "audio/mp4";
  }
  if (
    bytes.length >= 3 &&
    (String.fromCharCode(...bytes.slice(0, 3)) === "ID3" ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))
  ) {
    return "audio/mpeg";
  }
  return null;
}
