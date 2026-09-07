import type { ButtonHTMLAttributes, AnchorHTMLAttributes, CSSProperties } from "react";
import { pct, slice } from "@/lib/design";

export type Rect = [x: number, y: number, w: number, h: number];

/** 切り出し画像内のデザイン px 矩形を、その画像に対する % 配置スタイルへ変換する。 */
export function hitStyle(sliceName: string, rect: Rect): CSSProperties {
  const s = slice(sliceName);
  return pct(rect, s.width, s.height);
}

/** 見た目に何も足さない透明な当たり判定（button）。PC / SP の表示切替は親の切り出しに従う。 */
export function HitButton({
  sliceName,
  rect,
  label,
  className = "",
  ...rest
}: { sliceName: string; rect: Rect; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const s = slice(sliceName);
  return (
    <button type="button" className={`hit ${s.device}-only ${className}`.trim()} style={hitStyle(sliceName, rect)} {...rest}>
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** 実在する遷移先がある場合だけ使う透明リンク（ダミー href は禁止）。 */
export function HitLink({
  sliceName,
  rect,
  label,
  href,
  className = "",
  ...rest
}: { sliceName: string; rect: Rect; label: string; href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const s = slice(sliceName);
  return (
    <a href={href} className={`hit ${s.device}-only ${className}`.trim()} style={hitStyle(sliceName, rect)} {...rest}>
      <span className="sr-only">{label}</span>
    </a>
  );
}
