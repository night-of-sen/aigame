# SYNTHPLAY Sandbox Proxy Worker (`*.synthplay-box.cloud`)

Serves extracted user-uploaded HTML5/WebGL game bundles directly from Cloudflare R2 (`synthplay-games-prod`) with:
- Zero egress fees
- Per-game origin isolation (`https://<gameId>.synthplay-box.cloud/`)
- Strict `Content-Security-Policy` (`frame-ancestors https://synthplay.games ...`)
- `Referer` anti-hotlink guard

## Deploy (1 Command)
```bash
cd workers/sandbox-proxy
npx wrangler login
npx wrangler deploy
```

Make sure `synthplay-box.cloud` DNS has a proxied wildcard record (`*` -> `A 192.0.2.1` orange cloud ON) so Cloudflare routes `*.synthplay-box.cloud` to this Worker.
