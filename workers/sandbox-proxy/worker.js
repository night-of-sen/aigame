// SYNTHPLAY Sandbox Proxy Worker (*.synthplay-box.cloud)
// Paste directly into Cloudflare Dashboard -> Workers & Pages -> Create Worker -> Edit code
// Required Binding in Worker Settings -> Bindings:
//   R2 bucket binding: Variable name = GAMES_PROD, R2 bucket = synthplay-games-prod

const MIME_MAP = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  wasm: "application/wasm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf"
};

function guessContentType(key, fallback) {
  if (fallback) return fallback;
  const ext = (key.split(".").pop() || "").toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

function buildCsp(parentOrigins) {
  return [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
    "connect-src 'self' data: blob:",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    `frame-ancestors ${parentOrigins}`,
    "base-uri 'self'",
    "form-action 'none'"
  ].join("; ");
}

function isAllowedReferer(referer) {
  if (!referer) return true;
  try {
    const host = new URL(referer).hostname.toLowerCase();
    return (
      host === "synthplay.games" ||
      host.endsWith(".synthplay.games") ||
      host === "synthplay-box.cloud" ||
      host.endsWith(".synthplay-box.cloud") ||
      host === "localhost"
    );
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!isAllowedReferer(request.headers.get("Referer"))) {
      return new Response("Hotlinking Forbidden — Play on https://synthplay.games", { status: 403 });
    }

    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const subdomain = host.endsWith(".synthplay-box.cloud")
      ? host.slice(0, -".synthplay-box.cloud".length)
      : "cdn";

    let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!pathname || pathname.endsWith("/")) {
      pathname += "index.html";
    }
    if (pathname.includes("..")) {
      return new Response("Invalid Path", { status: 400 });
    }

    const r2Key =
      subdomain === "cdn" || subdomain === "www"
        ? pathname
        : `games/${subdomain}/${pathname}`;

    const object = await env.GAMES_PROD.get(r2Key);
    if (!object) {
      return new Response("SYNTHPLAY Sandbox Asset Not Found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", guessContentType(r2Key, object.httpMetadata && object.httpMetadata.contentType));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    headers.set(
      "Content-Security-Policy",
      buildCsp(env.ALLOWED_PARENT_ORIGINS || "https://synthplay.games https://www.synthplay.games https://admin.synthplay.games")
    );
    headers.set(
      "Cache-Control",
      r2Key.endsWith(".html") ? "public, max-age=300" : "public, max-age=31536000, immutable"
    );
    if (object.httpEtag) {
      headers.set("ETag", object.httpEtag);
    }

    return new Response(request.method === "HEAD" ? null : object.body, {
      status: 200,
      headers
    });
  }
};
