import type { NextConfig } from "next";

// 静的書き出し。画像最適化は使わない（再エンコード・リサイズで画素が変わるため）。
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: false,
  reactStrictMode: true,
};

export default nextConfig;
