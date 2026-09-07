import type { ReactNode } from "react";
import Section from "@/components/Section";
import DebugFlag from "@/components/DebugFlag";
import { MenuButton, MenuProvider } from "@/components/Menu";
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
      <main className="lp">
        {SECTIONS.map((spec) => (
          <Section key={spec.id} spec={spec} overlays={OVERLAYS} eager={EAGER_SECTIONS.has(spec.id)} />
        ))}
      </main>
    </MenuProvider>
  );
}
