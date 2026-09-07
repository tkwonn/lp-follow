import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "follow｜豊洲駅徒歩1分 マシンピラティス・パーソナルセッション専門スタジオ",
  description:
    "豊洲駅1c出口から徒歩1分。スタジオ専門のfollowで、ひとりひとりをきちんと見る本格パーソナルセッション。はじめての方限定の体験セッション（45分）￥8,800。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
