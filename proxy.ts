import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function secure(response: NextResponse): NextResponse {
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

function matches(actual: string, expected: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(actual).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

/** Next.js 16 の Proxy（旧 Middleware）で全リクエストを保護。 */
export function proxy(request: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  const headers = { "Cache-Control": "private, no-store" };
  // 環境変数を設定し忘れても公開しない。
  if (!username || !password || username.includes(":")) {
    return secure(new NextResponse("Authentication is not configured.", { status: 503, headers }));
  }
  const token = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (token) {
    const credentials = Buffer.from(token, "base64").toString("utf8");
    const separator = credentials.indexOf(":");
    if (separator >= 0) {
      const userMatches = matches(credentials.slice(0, separator), username);
      const passwordMatches = matches(credentials.slice(separator + 1), password);
      if (userMatches && passwordMatches) {
        const response = NextResponse.next();
        response.headers.set("Cache-Control", "private, no-store");
        return secure(response);
      }
    }
  }
  return secure(new NextResponse("Authentication required.", {
    status: 401,
    headers: { ...headers, "WWW-Authenticate": 'Basic realm="follow preview", charset="UTF-8"' },
  }));
}

// HTML、画像、フォント、Next.js 静的ファイルをすべて認証対象にする。
export const config = { matcher: "/:path*" };
