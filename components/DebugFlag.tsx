"use client";

import { useEffect } from "react";

/** `?debug=1` のとき当たり判定を可視化する（`html.debug`）。通常表示には影響しない。 */
export default function DebugFlag() {
  useEffect(() => {
    const on = new URLSearchParams(window.location.search).get("debug") === "1";
    document.documentElement.classList.toggle("debug", on);
  }, []);
  return null;
}
