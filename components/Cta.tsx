"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HitButton } from "@/components/HitArea";
import type { Cta } from "@/lib/cta";

/**
 * CTA「体験セッションを予約する」（リンク先未設定）。
 * - 見た目には何も足さない透明な `button`（画像のボタンに重ねる当たり判定）。
 * - クリック／Enter／Space で「リンク先は未設定」の案内（`role="status"`）をページ下部に数秒表示する。
 *   案内は操作後にだけ現れる**プレビュー用の明示**で、デザインには無い要素（0.000% の対象外。基準状態では空で `:empty` により非表示）。
 * - 遷移先が確定したら `a[href]` に差し替える（ダミー `href` は使わない）。
 */

type NoticeState = { show: (message: string) => void };
const NoticeContext = createContext<NoticeState | null>(null);

export const CTA_NOTICE_ID = "cta-notice";
const NOTICE_MS = 5000;

export function CtaProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(m);
    timer.current = setTimeout(() => setMessage(null), NOTICE_MS);
  }, []);
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(null);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <NoticeContext.Provider value={value}>
      {children}
      {/* 常に DOM に置く（live region は表示前から存在させる）。空のときは CSS の :empty で非表示 */}
      <div id={CTA_NOTICE_ID} className="cta-notice" role="status" aria-live="polite">
        {message !== null && (
          <>
            <span>{message}</span>
            <button type="button" className="cta-notice__close" onClick={hide} aria-label="案内を閉じる">
              ×
            </button>
          </>
        )}
      </div>
    </NoticeContext.Provider>
  );
}

function useNotice(): NoticeState {
  const ctx = useContext(NoticeContext);
  if (!ctx) throw new Error("CtaButton must be used inside CtaProvider");
  return ctx;
}

export function CtaButton({ cta }: { cta: Cta }) {
  const { show } = useNotice();
  return (
    <HitButton
      sliceName={cta.slice}
      rect={cta.rect}
      label={`${cta.label}（リンク未設定）`}
      data-cta={cta.id}
      data-cta-ledger={cta.ledger}
      onClick={() => show(`「${cta.label}」のリンク先は未設定です（遷移先の確定後に設定します）。`)}
    />
  );
}
