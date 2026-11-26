import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@synthplay/db",
    "@synthplay/i18n",
    "@synthplay/sandbox-security",
    "@synthplay/game-sdk"
  ],
  images: {
    unoptimized: true
  }
};

export default nextConfig;
