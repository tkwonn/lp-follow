import type { ReactNode } from "react";
import Section from "@/components/Section";
import DebugFlag from "@/components/DebugFlag";
import { LpMain, MenuButton, MenuOverlay, MenuProvider } from "@/components/Menu";
import { SECTIONS } from "@/lib/design";

/** 切り出し名 → 重ねる当たり判定。矩形は docs/sections.md のデザイン px。 */
const OVERLAYS: Record<string, ReactNode> = {
  "PC-1_01_header": <MenuButton sliceName="PC-1_01_header" rect={[1440, 24, 72, 76]} />,
  "SP-1_01_header": <MenuButton sliceName="SP-1_01_header" rect={[640, 24, 96, 80]} />,
};

/** 先頭から eager に読み込む区画（ファーストビューまで）。 */
const EAGER_SECTIONS = new Set(["header", "top"]);

export default function Page() {
  return (
    <MenuProvider>
      <DebugFlag />
      <LpMain>
        {SECTIONS.map((spec) => (
          <Section key={spec.id} spec={spec} overlays={OVERLAYS} eager={EAGER_SECTIONS.has(spec.id)} />
        ))}
      </LpMain>
      {/* メニュー展開図（単位 02）。main の外に置き、展開中は main を inert にする */}
      <MenuOverlay />
    </MenuProvider>
  );
}
