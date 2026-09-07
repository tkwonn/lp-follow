"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { HitButton, type Rect } from "@/components/HitArea";

type MenuState = { open: boolean; toggle: () => void; close: () => void };
const MenuContext = createContext<MenuState | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, toggle, close }), [open, toggle, close]);
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuState {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used inside MenuProvider");
  return ctx;
}

/**
 * ヘッダーのハンバーガー（開く）ボタン。展開図の重ね表示はユニット 02 で実装する。
 * `aria-controls` は参照先（メニュー要素）を実装する単位 02 で付ける（存在しない id を参照しない。Codex 指摘 2026-09-07）。
 */
export function MenuButton({ sliceName, rect }: { sliceName: string; rect: Rect }) {
  const { open, toggle } = useMenu();
  return (
    <HitButton
      sliceName={sliceName}
      rect={rect}
      label={open ? "メニューを閉じる" : "メニューを開く"}
      aria-expanded={open}
      onClick={toggle}
    />
  );
}
