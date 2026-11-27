export interface SecurityFinding {
  severity: "critical" | "warning" | "info";
  rule: string;
  message: string;
  snippet?: string;
}

export interface SecurityScanReport {
  verdict: "SAFE" | "REVIEW_REQUIRED" | "BLOCKED";
  score: number; // 0-100 (100 = cleanest)
  byteSize: number;
  findings: SecurityFinding[];
  externalHosts: string[];
  scannedAt: string;
}

export interface ZipManifestEntry {
  path: string;
  compressedBytes: number;
  uncompressedBytes: number;
}

const ALLOWED_EXTENSIONS = new Set([
  ".html", ".htm", ".js", ".mjs", ".css", ".json", ".wasm", ".data", ".pck",
  ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".ico",
  ".mp3", ".ogg", ".wav", ".m4a", ".webm", ".mp4",
  ".glb", ".gltf", ".bin", ".obj", ".mtl", ".ttf", ".otf", ".woff", ".woff2", ".txt", ".xml"
]);

const FORBIDDEN_PATTERNS: Array<{
  rule: string;
  severity: "critical" | "warning";
  regex: RegExp;
  message: string;
}> = [
  {
    rule: "TOP_FRAME_HIJACK",
    severity: "critical",
    regex: /\b(top|parent)\s*\.\s*location\b/gi,
    message: "Detected attempt to hijack parent/top window navigation."
  },
  {
    rule: "COOKIE_ACCESS",
    severity: "critical",
    regex: /\bdocument\s*\.\s*cookie\b/gi,
    message: "Detected direct document.cookie read/write inside game bundle."
  },
  {
    rule: "CRYPTO_MINER_SIGNATURE",
    severity: "critical",
    regex: /\b(CoinHive|coinhive|cryptonight|stratum\+tcp|minero\.cc|webminerpool)\b/gi,
    message: "Detected known browser cryptocurrency miner signature."
  },
  {
    rule: "OBFUSCATED_EVAL",
    severity: "warning",
    regex: /\beval\s*\(\s*(atob|unescape|decodeURIComponent|Function)\b/gi,
    message: "Detected obfuscated dynamic eval(); requires manual moderator review."
  },
  {
    rule: "DYNAMIC_SCRIPT_INJECTION",
    severity: "warning",
    regex: /createElement\s*\(\s*['"`]script['"`]\s*\)/gi,
    message: "Dynamically creates <script> elements; external hosts will be constrained by sandbox CSP."
  }
];

export const SANDBOX_LIMITS = {
  maxSingleHtmlBytes: 5 * 1024 * 1024, // 5MB for Paste & Play single HTML
  maxZipCompressedBytes: 100 * 1024 * 1024, // 100MB compressed
  maxZipUncompressedBytes: 200 * 1024 * 1024, // 200MB uncompressed
  maxZipFiles: 1500,
  maxCompressionRatio: 100
};

/**
 * Static security scanner for AI single-file HTML submissions or extracted HTML/JS files.
 */
export function scanHtmlSubmission(html: string): SecurityScanReport {
  const byteSize = new TextEncoder().encode(html).length;
  const findings: SecurityFinding[] = [];
  const externalHosts = new Set<string>();

  if (byteSize > SANDBOX_LIMITS.maxSingleHtmlBytes) {
    findings.push({
      severity: "critical",
      rule: "SIZE_LIMIT_EXCEEDED",
      message: `Single-HTML payload (${(byteSize / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit.`
    });
  }

  for (const check of FORBIDDEN_PATTERNS) {
    const match = html.match(check.regex);
    if (match && match.length > 0) {
      findings.push({
        severity: check.severity,
        rule: check.rule,
        message: check.message,
        snippet: match[0].slice(0, 80)
      });
    }
  }

  // Extract external HTTP(S) domains referenced inside the game
  const urlMatches = html.matchAll(/https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
  for (const m of urlMatches) {
    const host = m[1].toLowerCase();
    if (!host.includes("synthplay")) {
      externalHosts.add(host);
    }
  }

  if (externalHosts.size > 0) {
    findings.push({
      severity: "info",
      rule: "EXTERNAL_HOSTS_DETECTED",
      message: `References ${externalHosts.size} external host(s). Sandbox CSP will restrict unapproved hosts.`
    });
  }

  const hasCritical = findings.some((f) => f.severity === "critical");
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  let score = 100;
  if (hasCritical) score = Math.max(0, 30 - findings.filter((f) => f.severity === "critical").length * 15);
  else score = Math.max(55, 100 - warningCount * 15);

  const verdict: SecurityScanReport["verdict"] = hasCritical
    ? "BLOCKED"
    : warningCount > 0
      ? "REVIEW_REQUIRED"
      : "SAFE";

  return {
    verdict,
    score,
    byteSize,
    findings,
    externalHosts: Array.from(externalHosts),
    scannedAt: new Date().toISOString()
  };
}

/**
 * Validates ZIP package manifest before extraction to block Zip Bombs, path traversal, and executable uploads.
 */
export function validateZipManifest(entries: ZipManifestEntry[]): {
  ok: boolean;
  errors: string[];
  hasIndexHtml: boolean;
  totalUncompressedBytes: number;
} {
  const errors: string[] = [];
  let totalUncompressedBytes = 0;
  let totalCompressedBytes = 0;
  let hasIndexHtml = false;

  if (entries.length === 0) {
    errors.push("ZIP archive is empty.");
  }
  if (entries.length > SANDBOX_LIMITS.maxZipFiles) {
    errors.push(`Archive contains ${entries.length} files, exceeding limit of ${SANDBOX_LIMITS.maxZipFiles}.`);
  }

  for (const entry of entries) {
    const normalized = entry.path.replace(/\\/g, "/");
    if (normalized.startsWith("/") || normalized.includes("../")) {
      errors.push(`Path traversal detected: ${entry.path}`);
      continue;
    }

    if (normalized.toLowerCase() === "index.html" || normalized.toLowerCase().endsWith("/index.html")) {
      hasIndexHtml = true;
    }

    const dotIdx = normalized.lastIndexOf(".");
    if (dotIdx !== -1 && !normalized.endsWith("/")) {
      const ext = normalized.slice(dotIdx).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        errors.push(`Disallowed file extension "${ext}" in ${entry.path}`);
      }
    }

    totalUncompressedBytes += entry.uncompressedBytes;
    totalCompressedBytes += Math.max(1, entry.compressedBytes);
  }

  if (totalUncompressedBytes > SANDBOX_LIMITS.maxZipUncompressedBytes) {
    errors.push("Uncompressed archive exceeds 200MB safety limit (possible Zip Bomb).");
  }
  if (totalUncompressedBytes / Math.max(1, totalCompressedBytes) > SANDBOX_LIMITS.maxCompressionRatio) {
    errors.push("Abnormal compression ratio detected (possible Zip Bomb).");
  }
  if (!hasIndexHtml) {
    errors.push("Missing required entry point: index.html");
  }

  return {
    ok: errors.length === 0,
    errors,
    hasIndexHtml,
    totalUncompressedBytes
  };
}

/**
 * Builds strict Content-Security-Policy header for isolated game sandbox domain (*.synthplay-box.cloud).
 */
export function buildSandboxCspHeader(approvedExternalHosts: string[] = []): string {
  const extra = approvedExternalHosts.map((h) => `https://${h}`).join(" ");
  return [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
    `connect-src 'self' data: blob: ${extra}`.trim(),
    `img-src 'self' data: blob: ${extra}`.trim(),
    `media-src 'self' data: blob: ${extra}`.trim(),
    "frame-ancestors https://synthplay.games https://*.synthplay.games http://localhost:3000 http://localhost:3001",
    "base-uri 'self'",
    "form-action 'none'"
  ].join("; ");
}

/**
 * Wraps a creator's single-file AI HTML submission with viewport normalization and SDK bridge.
 */
export function wrapSingleHtmlForSandbox(rawHtml: string, gameId: string): string {
  const bridge = `<script>
(function(){
  window.__SYNTHPLAY_GAME_ID__ = ${JSON.stringify(gameId)};
  var pendingLoads = [];
  window.addEventListener("message", function(ev){
    if(ev.data && ev.data.source === "synthplay-host" && ev.data.type === "LOAD_STATE_RESULT"){
      while(pendingLoads.length){ try { pendingLoads.shift()(ev.data.payload || null); } catch(e){} }
    }
  });
  window.SynthPlay = {
    submitScore: function(score){
      try { window.parent.postMessage({ source: "synthplay-sdk", type: "SCORE", gameId: ${JSON.stringify(gameId)}, score: Number(score) || 0 }, "*"); } catch(e){}
    },
    saveState: function(payload){
      try { window.parent.postMessage({ source: "synthplay-sdk", type: "SAVE_STATE", gameId: ${JSON.stringify(gameId)}, payload: payload || {} }, "*"); } catch(e){}
    },
    loadState: function(cb){
      if(typeof cb === "function") pendingLoads.push(cb);
      try { window.parent.postMessage({ source: "synthplay-sdk", type: "LOAD_STATE", gameId: ${JSON.stringify(gameId)} }, "*"); } catch(e){}
    },
    openTip: function(){
      try { window.parent.postMessage({ source: "synthplay-sdk", type: "OPEN_TIP", gameId: ${JSON.stringify(gameId)} }, "*"); } catch(e){}
    }
  };
})();
</script>`;

  if (/<head[^>]*>/i.test(rawHtml)) {
    return rawHtml.replace(/<head([^>]*)>/i, `<head$1>${bridge}`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${bridge}<style>html,body{margin:0;padding:0;overflow:hidden;background:#07080b;color:#f5f6f8;}</style></head><body>${rawHtml}</body></html>`;
}
