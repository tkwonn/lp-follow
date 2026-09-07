import type { NextConfig } from "next";

// Vercel の Next.js ランタイムで proxy.ts の認証を実行する。
// 画像最適化は使わない（再エンコード・リサイズで画素が変わるため）。
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  trailingSlash: false,
  reactStrictMode: true,
};

export default nextConfig;
