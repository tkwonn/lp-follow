import type { ReactNode } from "react";
import { BREAKPOINT, CSS_WIDTH, slice, type Device, type SectionSpec, type Slice } from "@/lib/design";
import alts from "@/lib/alt.json";

const ALT = alts as Record<string, string>;

function altOf(s: Slice): string {
  const a = ALT[s.name];
  if (a === undefined) throw new Error(`alt text missing for slice ${s.name} (lib/alt.json)`);
  return a;
}

type Overlays = Record<string, ReactNode>;

/** 1 枚の切り出し画像（PC / SP のどちらか専用）。width/height は PNG の実寸。 */
function SingleSlice({ s, eager, overlay }: { s: Slice; eager: boolean; overlay?: ReactNode }) {
  const attrs = { [`data-slice-${s.device}`]: s.name } as Record<string, string>;
  return (
    <div className={`slice ${s.device}-only`} {...attrs}>
      <img
        src={s.src}
        width={s.imgWidth}
        height={s.imgHeight}
        alt={altOf(s)}
        loading={eager ? "eager" : "lazy"}
        decoding="sync"
        draggable={false}
      />
      {overlay}
    </div>
  );
}

/** PC / SP を 1 対 1 で対応させた切り出し（`picture` で切替。両方ダウンロードしない）。 */
function PairedSlice({ pc, sp, eager, overlay }: { pc: Slice; sp: Slice; eager: boolean; overlay?: ReactNode }) {
  const alt = altOf(pc);
  return (
    <div className="slice" data-slice-pc={pc.name} data-slice-sp={sp.name}>
      <picture>
        <source media={`(max-width: ${BREAKPOINT - 1}px)`} srcSet={sp.src} width={sp.imgWidth} height={sp.imgHeight} />
        <img
          src={pc.src}
          width={pc.imgWidth}
          height={pc.imgHeight}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="sync"
          draggable={false}
        />
      </picture>
      {overlay}
    </div>
  );
}

/**
 * ページ構成 1 区画。PC と SP の切り出し数が同じなら `picture` で対にし、
 * 異なるなら PC 用・SP 用のスタックを別々に置く（非表示側は lazy なので読み込まれない）。
 */
export default function Section({
  spec,
  overlays = {},
  eager = false,
}: {
  spec: SectionSpec;
  overlays?: Overlays;
  eager?: boolean;
}) {
  const pc = spec.pc.map(slice);
  const sp = spec.sp.map(slice);
  const paired = pc.length === sp.length;
  return (
    <section id={spec.id} data-section={spec.id} data-unit={spec.unit}>
      {paired
        ? pc.map((p, i) => (
            <PairedSlice
              key={p.name}
              pc={p}
              sp={sp[i]}
              eager={eager}
              overlay={
                <>
                  {overlays[p.name]}
                  {overlays[sp[i].name]}
                </>
              }
            />
          ))
        : [...pc, ...sp].map((s) => <SingleSlice key={s.name} s={s} eager={eager} overlay={overlays[s.name]} />)}
    </section>
  );
}

export { CSS_WIDTH };
export type { Device };
