import { NextRequest, NextResponse } from "next/server";
import { USER_SESSION_COOKIE, verifySessionToken } from "@synthplay/db";
import { createPresignedQuarantineUpload } from "@/lib/r2Storage";

export async function POST(req: NextRequest) {
  try {
    const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Please sign in before uploading a game bundle." }, { status: 401 });
    }

    const body = await req.json();
    const fileName = String(body.fileName || "game.zip").trim();
    const sizeBytes = Number(body.sizeBytes || 0);

    if (!fileName.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Only .zip HTML5/WebGL bundles are accepted." }, { status: 400 });
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json({ error: "Invalid file size." }, { status: 400 });
    }

    const result = await createPresignedQuarantineUpload({ fileName, sizeBytes });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to initialize upload.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
