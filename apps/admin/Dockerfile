FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

ARG NEXT_PUBLIC_MAIN_DOMAIN=https://synthplay.games
ARG NEXT_PUBLIC_ADMIN_DOMAIN=https://admin.synthplay.games
ENV NEXT_PUBLIC_MAIN_DOMAIN=$NEXT_PUBLIC_MAIN_DOMAIN
ENV NEXT_PUBLIC_ADMIN_DOMAIN=$NEXT_PUBLIC_ADMIN_DOMAIN

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @synthplay/admin build

EXPOSE 3001
CMD ["pnpm", "--filter", "@synthplay/admin", "start"]
