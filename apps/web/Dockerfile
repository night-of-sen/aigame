FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_MAIN_DOMAIN=https://synthplay.games
ARG NEXT_PUBLIC_ADMIN_DOMAIN=https://admin.synthplay.games
ARG NEXT_PUBLIC_SANDBOX_DOMAIN=https://synthplay-box.cloud
ENV NEXT_PUBLIC_MAIN_DOMAIN=$NEXT_PUBLIC_MAIN_DOMAIN
ENV NEXT_PUBLIC_ADMIN_DOMAIN=$NEXT_PUBLIC_ADMIN_DOMAIN
ENV NEXT_PUBLIC_SANDBOX_DOMAIN=$NEXT_PUBLIC_SANDBOX_DOMAIN

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @synthplay/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@synthplay/web", "start"]
