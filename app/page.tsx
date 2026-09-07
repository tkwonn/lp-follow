import type { ReactNode } from "react";
import Section from "@/components/Section";
import Faq from "@/components/Faq";
import DebugFlag from "@/components/DebugFlag";
import { CtaButton, CtaProvider } from "@/components/Cta";
import { LpMain, MenuButton, MenuOverlay, MenuProvider } from "@/components/Menu";
import { CTAS } from "@/lib/cta";
import { SECTIONS } from "@/lib/design";

/** 切り出し名 → 重ねる当たり判定。矩形は docs/sections.md のデザイン px（切り出し相対）。 */
const OVERLAYS: Record<string, ReactNode> = {
  "PC-1_01_header": <MenuButton sliceName="PC-1_01_header" rect={[1440, 24, 72, 76]} />,
  "SP-1_01_header": <MenuButton sliceName="SP-1_01_header" rect={[640, 24, 96, 80]} />,
  // CTA「体験セッションを予約する」（lib/cta.ts。単位 04 以降、リンク先未設定）。FAQ 内の「予約サイトはこちら」は components/Faq.tsx が同じ lib/cta.ts から置く
  ...Object.fromEntries(
    CTAS.map((cta) => [cta.slice, <CtaButton key={`${cta.slice}-${cta.id}`} cta={cta} />] as const),
  ),
};

/** 先頭から eager に読み込む区画（ファーストビューまで）。 */
const EAGER_SECTIONS = new Set(["header", "top"]);

export default function Page() {
  return (
    <MenuProvider>
      <CtaProvider>
        <DebugFlag />
        <LpMain>
          {SECTIONS.map((spec) =>
            spec.component === "faq" ? (
              <Faq key={spec.id} spec={spec} />
            ) : (
              <Section key={spec.id} spec={spec} overlays={OVERLAYS} eager={EAGER_SECTIONS.has(spec.id)} />
            ),
          )}
        </LpMain>
        {/* メニュー展開図（単位 02）。main の外に置き、展開中は main を inert にする */}
        <MenuOverlay />
      </CtaProvider>
    </MenuProvider>
  );
}
