# SYNTHPLAY (`synthplay.games`)

Global Free & AI-Crafted Cyber Arcade Platform — Phase 1 Monorepo.

## Production Domains

- **Main Storefront**: `https://synthplay.games`
- **Admin Console**: `https://admin.synthplay.games`
- **Isolated Game Sandbox**: `https://*.synthplay-box.cloud` (`cdn.synthplay-box.cloud`)

## Architecture Overview

- **Storefront (`apps/web`, port `3000`)**: Next.js 15 App Router, Neo-Tokyo Industrial Cyber Arcade design system, full-bleed WebGL GLSL fluid phosphor shader + FPS Tactical Box Crosshair + hover live 60fps gameplay previews + automatic Zero-Contention GPU Pause when playing, 4 languages (`zh-CN`, `en`, `ja`, `es`), Country Classification, Live Global & Country Power Leaderboards, Dual-Mode Creator Upload Studio (ZIP + AI Single-HTML Paste & Play), User & Creator Dashboard, and 5 Dedicated Sponsor Showcase Slots.
- **Operations Console (`apps/admin`, port `3001`)**: Independent Admin & Moderation Console (Game Review & Isolated Sandbox Inspector, User Governance, 5-Slot Sponsor CMS, Finance Ledger CSV Export, i18n Coverage, and Immutable Audit Log).
- **Shared Packages**:
  - `@synthplay/db`: Drizzle ORM PostgreSQL 16 schema + shared live dev store.
  - `@synthplay/sandbox-security`: Static HTML/JS malicious pattern scanner, Zip Bomb & path-traversal guard, CSP header builder, single-HTML sandbox wrapper.
  - `@synthplay/i18n`: Typed 4-language dictionary & country registry.
  - `@synthplay/game-sdk`: Lightweight `postMessage` creator SDK (`cloud saves`, `scores`, `rewarded ads`, `creator tips`).

## Local Development

```bash
pnpm install
pnpm dev:web    # Storefront -> http://localhost:3000
pnpm dev:admin  # Admin Ops  -> http://localhost:3001
```

## Production Deployment (Option B: Hostinger KVM 2 + Docker + Cloudflare R2)

1. Copy `.env.example` to `.env` and fill in your PostgreSQL, Cloudflare R2, Dual Domains (`synthplay.games` + `synthplay-box.cloud`), PayPal, Creem, Ko-fi, and Patreon secrets.
2. Start the full production stack with automatic HTTPS via Caddy:

```bash
docker compose up -d --build
pnpm db:push
```

See [docs/DEPLOY_HOSTINGER.md](./docs/DEPLOY_HOSTINGER.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the complete deployment & operations playbook.
