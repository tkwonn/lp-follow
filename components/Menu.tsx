"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { HitButton, HitLink, type Rect } from "@/components/HitArea";
import { PairedSlice } from "@/components/Section";
import { slice } from "@/lib/design";
import { MENU_CLOSE_RECT, MENU_ITEMS, MENU_SLICE, anchorExists } from "@/lib/menu";

export const MENU_ID = "site-menu";

type MenuState = { open: boolean; toggle: () => void; close: () => void; preload: () => void };
const MenuContext = createContext<MenuState | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const preloadRef = useRef<HTMLImageElement | null>(null);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const preload = useCallback(() => {
    if (preloadRef.current) return;
    const dev = window.matchMedia("(max-width: 767px)").matches ? "sp" : "pc";
    const image = new Image();
    image.decoding = "sync";
    image.src = slice(MENU_SLICE[dev]).src;
    preloadRef.current = image;
  }, []);
  const value = useMemo(() => ({ open, toggle, close, preload }), [open, toggle, close, preload]);
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuState {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used inside MenuProvider");
  return ctx;
}

/** LP 本体。メニュー展開中は `inert` にして背景をフォーカス・読み上げの対象から外す。 */
export function LpMain({ children }: { children: ReactNode }) {
  const { open } = useMenu();
  return (
    <main className="lp" inert={open || undefined}>
      {children}
    </main>
  );
}

/** ヘッダーのハンバーガー（開く）ボタン。展開中は展開図（MenuOverlay）に覆われる。 */
export function MenuButton({ sliceName, rect }: { sliceName: string; rect: Rect }) {
  const { open, toggle, preload } = useMenu();
  return (
    <HitButton
      sliceName={sliceName}
      rect={rect}
      label="メニューを開く"
      aria-expanded={open}
      aria-controls={MENU_ID}
      onFocus={preload}
      onPointerEnter={preload}
      onPointerDown={preload}
      onClick={toggle}
    />
  );
}

/** 表示中（display:none でない）の要素だけ。PC 用と SP 用の当たり判定が両方 DOM にあるため。 */
function visibleFocusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("a.hit, button.hit")].filter((el) => getComputedStyle(el).display !== "none");
}

/**
 * ハンバーガーメニューの展開図（単位 02）。
 * - PC-Menu（1920×1000）/ SP-Menu（750×1400）を viewport 先頭（position: fixed）に y=0 から全面で重ねる。
 *   展開図のヘッダー部は通常ヘッダーと異なる（PC はタグライン無し、× に置換）ため y≥120 だけの重ねでは成立しない。
 * - 閉じる（×）と 9 項目は透明な当たり判定。項目はリンク先セクションが実装済みなら `a`、未実装なら「リンク未設定」の button。
 * - 開いたら閉じるボタンへフォーカス、Escape で閉じる、閉じたら開くボタンへフォーカス復帰、Tab は閉じる→項目 1〜9 で循環。
 * - 開いている間は html を overflow:hidden（スクロールバー幅ぶん padding-right で補正し、レイアウト幅を変えない）。
 * - 常に DOM に置き（hidden）、画像はボタンの hover / focus / pointerdown で先読みする。
 *   閉じたままの初期表示では取得せず、LCP の通信を妨げない。閉状態では描画に一切関与しない。
 */
export function MenuOverlay() {
  const { open, close } = useMenu();
  const ref = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;
    const html = document.documentElement;

    // 開く直前にフォーカスされていた要素（通常はハンバーガー）へ、閉じたときに戻す
    const active = document.activeElement as HTMLElement | null;
    openerRef.current =
      active && active !== document.body
        ? active
        : [...document.querySelectorAll<HTMLElement>(`[aria-controls="${MENU_ID}"]`)].find((el) => getComputedStyle(el).display !== "none") ?? null;

    // 背景スクロール抑止（スクロールバーが幅を持つ環境ではその幅を padding-right で補い、コンテンツ幅を保つ）
    const gutter = window.innerWidth - html.clientWidth;
    const prev = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
    html.style.overflow = "hidden";
    if (gutter > 0) html.style.paddingRight = `${gutter}px`;

    visibleFocusables(root)[0]?.focus({ preventScroll: true });

    return () => {
      html.style.overflow = prev.overflow;
      html.style.paddingRight = prev.paddingRight;
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = visibleFocusables(ref.current);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const cur = document.activeElement;
      if (e.shiftKey && (cur === first || !items.includes(cur as HTMLElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && cur === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [close],
  );

  const pc = slice(MENU_SLICE.pc);
  const sp = slice(MENU_SLICE.sp);

  return (
    <div
      id={MENU_ID}
      ref={ref}
      className="menu-layer"
      role="dialog"
      aria-modal="true"
      aria-label="メニュー"
      hidden={!open}
      onKeyDown={onKeyDown}
    >
      <div className="menu-layer__inner">
        <PairedSlice
          pc={pc}
          sp={sp}
          eager={open}
          overlay={
            <>
              {(["pc", "sp"] as const).map((dev) => (
                <HitButton
                  key={`close-${dev}`}
                  sliceName={MENU_SLICE[dev]}
                  rect={MENU_CLOSE_RECT[dev]}
                  label="メニューを閉じる"
                  data-menu-close={dev}
                  onClick={close}
                />
              ))}
              {MENU_ITEMS.map((item) =>
                (["pc", "sp"] as const).map((dev) =>
                  anchorExists(item.target) ? (
                    <HitLink
                      key={`${item.target}-${dev}`}
                      sliceName={MENU_SLICE[dev]}
                      rect={item.rect[dev]}
                      href={`#${item.target}`}
                      label={`${item.ja}（${item.en}）`}
                      data-menu-item={item.target}
                      onClick={close}
                    />
                  ) : (
                    <HitButton
                      key={`${item.target}-${dev}`}
                      sliceName={MENU_SLICE[dev]}
                      rect={item.rect[dev]}
                      label={`${item.ja}（${item.en}）：リンク先セクション「${item.target}」は未実装のためリンク未設定`}
                      aria-disabled="true"
                      data-menu-item={item.target}
                      data-menu-pending=""
                    />
                  ),
                ),
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
