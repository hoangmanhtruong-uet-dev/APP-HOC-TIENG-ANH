import { NextRequest, NextResponse } from "next/server";
import { parseBuffer } from "music-metadata";
import { parseWebmDurationSeconds } from "@/features/speaking/server/webm-duration";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = file.type || detectMimeType(bytes) || "audio/webm";

    const metadata = await parseBuffer(
      bytes,
      { mimeType, size: bytes.byteLength },
      { duration: true, skipCovers: true }
    );

    const duration =
      metadata.format.duration ??
      (mimeType === "audio/webm" ? parseWebmDurationSeconds(bytes) : undefined);

    if (!duration || !Number.isFinite(duration)) {
      return NextResponse.json({ error: "Could not determine duration" }, { status: 400 });
    }

    return NextResponse.json({ durationSeconds: Math.round(duration * 1000) / 1000 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function detectMimeType(bytes: Uint8Array): string | null {
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
