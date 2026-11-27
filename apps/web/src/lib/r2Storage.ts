import fs from "node:fs";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { unzipSync } from "fflate";
import {
  SANDBOX_LIMITS,
  scanHtmlSubmission,
  validateZipManifest,
  wrapSingleHtmlForSandbox,
  type SecurityFinding,
  type SecurityScanReport,
  type ZipManifestEntry
} from "@synthplay/sandbox-security";

const MIME_MAP: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".pck": "application/octet-stream",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

export function isR2Configured(): boolean {
  const id = process.env.R2_ACCOUNT_ID || "";
  const key = process.env.R2_ACCESS_KEY_ID || "";
  const secret = process.env.R2_SECRET_ACCESS_KEY || "";
  return Boolean(
    id &&
      key &&
      secret &&
      !id.startsWith("your_") &&
      !key.startsWith("your_") &&
      !secret.startsWith("your_")
  );
}

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ""
      }
    });
  }
  return r2Client;
}

export function getLocalBundlesDir(): string {
  const storePath = process.env.SYNTHPLAY_STORE_PATH || path.join(process.cwd(), ".synthplay-data", "store.json");
  return path.join(path.dirname(storePath), "bundles");
}

export async function createPresignedQuarantineUpload(params: {
  fileName: string;
  sizeBytes: number;
}): Promise<{
  mode: "r2_presigned" | "direct_multipart";
  uploadUrl?: string;
  quarantineKey?: string;
  maxBytes: number;
}> {
  if (params.sizeBytes > SANDBOX_LIMITS.maxZipCompressedBytes) {
    throw new Error(`ZIP archive exceeds ${SANDBOX_LIMITS.maxZipCompressedBytes / 1024 / 1024}MB limit.`);
  }

  if (!isR2Configured()) {
    return {
      mode: "direct_multipart",
      maxBytes: SANDBOX_LIMITS.maxZipCompressedBytes
    };
  }

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "game.zip";
  const quarantineKey = `quarantine/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const bucket = process.env.R2_BUCKET_QUARANTINE || "synthplay-quarantine";

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: quarantineKey,
    ContentType: "application/zip"
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 900 });
  return {
    mode: "r2_presigned",
    uploadUrl,
    quarantineKey,
    maxBytes: SANDBOX_LIMITS.maxZipCompressedBytes
  };
}

export async function downloadQuarantineObject(quarantineKey: string): Promise<Uint8Array> {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured.");
  }
  const bucket = process.env.R2_BUCKET_QUARANTINE || "synthplay-quarantine";
  const res = await getR2Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: quarantineKey })
  );
  if (!res.Body) {
    throw new Error("Quarantine object not found.");
  }
  return await res.Body.transformToByteArray();
}

export async function deleteQuarantineObject(quarantineKey: string): Promise<void> {
  if (!isR2Configured()) return;
  const bucket = process.env.R2_BUCKET_QUARANTINE || "synthplay-quarantine";
  await getR2Client()
    .send(new DeleteObjectCommand({ Bucket: bucket, Key: quarantineKey }))
    .catch(() => {});
}

export interface ZipPublishResult {
  ok: boolean;
  error?: string;
  sandboxUrl?: string;
  storageMode?: "cloudflare_r2" | "local_sandbox";
  fileCount: number;
  totalBytes: number;
  scanReport: SecurityScanReport;
}

/**
 * Normalizes a single top-level directory inside a ZIP (e.g., `my-game/index.html` -> `index.html`)
 * and removes macOS `__MACOSX/` metadata files.
 */
function normalizeExtractedEntries(raw: Record<string, Uint8Array>): Array<{ path: string; data: Uint8Array }> {
  const cleaned: Array<{ path: string; data: Uint8Array }> = [];
  for (const [rawPath, data] of Object.entries(raw)) {
    const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized || normalized.endsWith("/")) continue;
    if (normalized.startsWith("__MACOSX/") || normalized.endsWith("/.DS_Store") || normalized === ".DS_Store") {
      continue;
    }
    cleaned.push({ path: normalized, data });
  }

  // If every file shares a single common root folder and there is no root index.html, unwrap it
  const hasRootIndex = cleaned.some((e) => e.path.toLowerCase() === "index.html");
  if (!hasRootIndex && cleaned.length > 0) {
    const firstSegments = new Set(cleaned.map((e) => (e.path.includes("/") ? e.path.split("/")[0] : "")));
    if (firstSegments.size === 1) {
      const prefix = `${Array.from(firstSegments)[0]}/`;
      if (prefix !== "/") {
        return cleaned.map((e) => ({
          path: e.path.startsWith(prefix) ? e.path.slice(prefix.length) : e.path,
          data: e.data
        }));
      }
    }
  }

  return cleaned;
}

/**
 * Unzips, enforces Zip Bomb / path traversal / file extension rules, runs static security scanning
 * on all HTML/JS files, injects the SynthPlay postMessage SDK into index.html, and publishes to
 * Cloudflare R2 (`synthplay-games-prod`) or local fallback bundle storage.
 */
export async function processAndPublishZipBundle(params: {
  zipBytes: Uint8Array;
  gameId: string;
}): Promise<ZipPublishResult> {
  if (params.zipBytes.byteLength > SANDBOX_LIMITS.maxZipCompressedBytes) {
    return {
      ok: false,
      error: "ZIP exceeds 100MB compressed limit.",
      fileCount: 0,
      totalBytes: 0,
      scanReport: {
        verdict: "BLOCKED",
        score: 0,
        byteSize: params.zipBytes.byteLength,
        findings: [{ severity: "critical", rule: "SIZE_LIMIT_EXCEEDED", message: "ZIP exceeds 100MB limit." }],
        externalHosts: [],
        scannedAt: new Date().toISOString()
      }
    };
  }

  let rawFiles: Record<string, Uint8Array>;
  try {
    rawFiles = unzipSync(params.zipBytes);
  } catch {
    return {
      ok: false,
      error: "Invalid or corrupted ZIP archive.",
      fileCount: 0,
      totalBytes: 0,
      scanReport: {
        verdict: "BLOCKED",
        score: 0,
        byteSize: params.zipBytes.byteLength,
        findings: [{ severity: "critical", rule: "CORRUPT_ZIP", message: "Archive could not be decompressed." }],
        externalHosts: [],
        scannedAt: new Date().toISOString()
      }
    };
  }

  const entries = normalizeExtractedEntries(rawFiles);
  const compressedPerEntry = Math.max(1, Math.floor(params.zipBytes.byteLength / Math.max(1, entries.length)));
  const manifest: ZipManifestEntry[] = entries.map((e) => ({
    path: e.path,
    compressedBytes: compressedPerEntry,
    uncompressedBytes: e.data.byteLength
  }));

  const manifestCheck = validateZipManifest(manifest);
  if (!manifestCheck.ok) {
    return {
      ok: false,
      error: manifestCheck.errors.join(" | "),
      fileCount: entries.length,
      totalBytes: manifestCheck.totalUncompressedBytes,
      scanReport: {
        verdict: "BLOCKED",
        score: 10,
        byteSize: manifestCheck.totalUncompressedBytes,
        findings: manifestCheck.errors.map((err) => ({
          severity: "critical" as const,
          rule: "ZIP_MANIFEST_REJECTED",
          message: err
        })),
        externalHosts: [],
        scannedAt: new Date().toISOString()
      }
    };
  }

  // Static security scan on all HTML and JS files inside the ZIP
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const encoder = new TextEncoder();
  const findings: SecurityFinding[] = [];
  const externalHosts = new Set<string>();
  let lowestScore = 100;
  let worstVerdict: SecurityScanReport["verdict"] = "SAFE";

  const finalFiles: Array<{ path: string; data: Uint8Array; contentType: string }> = [];

  for (const entry of entries) {
    const ext = path.extname(entry.path).toLowerCase();
    let payload = entry.data;

    if (ext === ".html" || ext === ".htm" || ext === ".js" || ext === ".mjs") {
      // Only scan text files up to 5MB each (larger Unity/Godot compiled wasm/js data chunks skip regex scan)
      if (entry.data.byteLength <= SANDBOX_LIMITS.maxSingleHtmlBytes) {
        const text = decoder.decode(entry.data);
        const subReport = scanHtmlSubmission(text);
        if (subReport.score < lowestScore) lowestScore = subReport.score;
        if (subReport.verdict === "BLOCKED") worstVerdict = "BLOCKED";
        else if (subReport.verdict === "REVIEW_REQUIRED" && worstVerdict === "SAFE") {
          worstVerdict = "REVIEW_REQUIRED";
        }
        for (const f of subReport.findings) {
          findings.push({ ...f, message: `[${entry.path}] ${f.message}` });
        }
        for (const h of subReport.externalHosts) externalHosts.add(h);

        // Inject SynthPlay SDK bridge into root index.html
        if (entry.path.toLowerCase() === "index.html") {
          payload = encoder.encode(wrapSingleHtmlForSandbox(text, params.gameId));
        }
      }
    }

    finalFiles.push({
      path: entry.path,
      data: payload,
      contentType: getMimeType(entry.path)
    });
  }

  const scanReport: SecurityScanReport = {
    verdict: worstVerdict,
    score: lowestScore,
    byteSize: manifestCheck.totalUncompressedBytes,
    findings: findings.slice(0, 25),
    externalHosts: Array.from(externalHosts),
    scannedAt: new Date().toISOString()
  };

  if (scanReport.verdict === "BLOCKED") {
    return {
      ok: false,
      error: "Security sandbox blocked this ZIP bundle due to critical code violations.",
      fileCount: entries.length,
      totalBytes: manifestCheck.totalUncompressedBytes,
      scanReport
    };
  }

  // Publish to Cloudflare R2 if configured; otherwise persist to local sandbox storage
  if (isR2Configured()) {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_PROD || "synthplay-games-prod";

    // Upload in batches of 10 to avoid socket exhaustion
    for (let i = 0; i < finalFiles.length; i += 10) {
      const batch = finalFiles.slice(i, i + 10);
      await Promise.all(
        batch.map((file) =>
          client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: `games/${params.gameId}/${file.path}`,
              Body: file.data,
              ContentType: file.contentType,
              CacheControl:
                file.path.toLowerCase() === "index.html"
                  ? "public, max-age=300"
                  : "public, max-age=31536000, immutable"
            })
          )
        )
      );
    }

    const wildcardEnabled = process.env.R2_WILDCARD_SANDBOX_ENABLED === "true";
    const sandboxDomain = (process.env.NEXT_PUBLIC_SANDBOX_DOMAIN || "https://synthplay-box.cloud")
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "");
    const sandboxBase = (
      process.env.R2_PUBLIC_CDN_URL ||
      "https://cdn.synthplay-box.cloud"
    ).replace(/\/$/, "");

    const sandboxUrl = wildcardEnabled
      ? `https://${params.gameId}.${sandboxDomain}/index.html`
      : `${sandboxBase}/games/${params.gameId}/index.html`;

    return {
      ok: true,
      sandboxUrl,
      storageMode: "cloudflare_r2",
      fileCount: finalFiles.length,
      totalBytes: manifestCheck.totalUncompressedBytes,
      scanReport
    };
  }

  // Local VPS fallback (served safely via /api/sandbox/[gameId]/index.html with strict CSP)
  const gameRoot = path.join(getLocalBundlesDir(), params.gameId);
  fs.mkdirSync(gameRoot, { recursive: true });
  for (const file of finalFiles) {
    const dest = path.resolve(gameRoot, file.path);
    if (!dest.startsWith(path.resolve(gameRoot) + path.sep)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.data);
  }

  return {
    ok: true,
    sandboxUrl: `/api/sandbox/${params.gameId}/index.html`,
    storageMode: "local_sandbox",
    fileCount: finalFiles.length,
    totalBytes: manifestCheck.totalUncompressedBytes,
    scanReport
  };
}

export function pickCategoryCoverFallback(category: string): string {
  const cat = (category || "").toUpperCase();
  if (cat.includes("RACING")) return "/games/tokyo-drift.jpg";
  if (cat.includes("TACTICS")) return "/games/mecha-arena.jpg";
  if (cat.includes("NOIR")) return "/games/noir-detective.jpg";
  if (cat.includes("SHMUP")) return "/games/bullet-hell.jpg";
  if (cat.includes("ROGUELIKE")) return "/games/synth-dungeon.jpg";
  if (cat.includes("STRATEGY")) return "/games/orbital-colony.jpg";
  if (cat.includes("PUZZLE")) return "/games/volt-2048.jpg";
  if (cat.includes("BRICK")) return "/games/pulse-breaker.jpg";
  if (cat.includes("SURVIVAL")) return "/games/hyper-survivor.jpg";
  return "/games/neon-serpent.jpg";
}

export async function saveGameCoverImage(gameId: string, dataUrl?: string): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > 1.5 * 1024 * 1024) return null;

  if (isR2Configured()) {
    const prodBucket = process.env.R2_BUCKET_PROD || "synthplay-games-prod";
    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket: prodBucket,
        Key: `games/${gameId}/cover.${ext}`,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable"
      })
    );

    const wildcardEnabled = process.env.R2_WILDCARD_SANDBOX_ENABLED === "true";
    const sandboxDomain = (process.env.NEXT_PUBLIC_SANDBOX_DOMAIN || "https://synthplay-box.cloud")
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "");
    const sandboxBase = (process.env.R2_PUBLIC_CDN_URL || "https://cdn.synthplay-box.cloud").replace(/\/$/, "");

    return wildcardEnabled
      ? `https://${gameId}.${sandboxDomain}/cover.${ext}`
      : `${sandboxBase}/games/${gameId}/cover.${ext}`;
  }

  const gameRoot = path.join(getLocalBundlesDir(), gameId);
  fs.mkdirSync(gameRoot, { recursive: true });
  fs.writeFileSync(path.join(gameRoot, `cover.${ext}`), bytes);
  return `/api/sandbox/${gameId}/cover.${ext}`;
}

