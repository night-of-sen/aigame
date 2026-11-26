import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { buildSandboxCspHeader } from "@synthplay/sandbox-security";
import { getLocalBundlesDir, getMimeType } from "@/lib/r2Storage";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ gameId: string; assetPath?: string[] }> }
) {
  const { gameId, assetPath } = await context.params;
  if (!/^[a-zA-Z0-9_-]{3,40}$/.test(gameId)) {
    return new NextResponse("Invalid game ID", { status: 400 });
  }

  const relPath = assetPath && assetPath.length > 0 ? assetPath.join("/") : "index.html";
  const baseDir = path.resolve(getLocalBundlesDir(), gameId);
  const fullPath = path.resolve(baseDir, relPath);

  // Strict directory traversal guard
  if (!fullPath.startsWith(baseDir + path.sep) && fullPath !== baseDir) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return new NextResponse("Asset not found", { status: 404 });
  }

  const data = fs.readFileSync(fullPath);
  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": getMimeType(fullPath),
      "Content-Security-Policy": buildSandboxCspHeader(),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": relPath.endsWith(".html") ? "public, max-age=120" : "public, max-age=86400"
    }
  });
}
