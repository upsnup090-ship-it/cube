import { NextRequest, NextResponse } from "next/server";

/**
 * /admin protection — HTTP Basic Auth.
 *
 * Behavior matrix:
 *
 * | NODE_ENV     | ADMIN_USERNAME / ADMIN_PASSWORD | Result                          |
 * |--------------|---------------------------------|---------------------------------|
 * | production   | both set                        | Basic Auth required             |
 * | production   | either missing                  | 503 Service Unavailable         |
 * | development  | both set                        | Basic Auth required             |
 * | development  | either missing                  | open (for local dev convenience)|
 *
 * Why Basic Auth and not Bcrypt:
 * - Edge runtime does not support node:crypto bcrypt out of the box.
 * - For an MVP staging panel, plaintext-in-env + timing-safe equal is acceptable.
 * - When the panel goes to production with real users, replace this with
 *   Telegram Login Widget or Mini App initData verification (see action-plan P2-6).
 */

export const config = {
  matcher: ["/admin/:path*"],
};

/**
 * Constant-time string comparison to prevent timing attacks.
 * Edge-compatible: pure JS, no node:crypto required.
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Compare against the longer of the two to avoid leaking length via early
  // exit. We still XOR all characters and finally OR a length-mismatch flag
  // so the function returns false when lengths differ, regardless of content.
  const len = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="BigPlayBot Admin", charset="UTF-8"',
    },
  });
}

function decodeBasicAuth(header: string | null): { user: string; pass: string } | null {
  if (!header || !header.startsWith("Basic ")) return null;
  const encoded = header.slice("Basic ".length).trim();
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;
  return {
    user: decoded.slice(0, sep),
    pass: decoded.slice(sep + 1),
  };
}

export function middleware(req: NextRequest) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  const isProduction = process.env.NODE_ENV === "production";

  // Production fail-closed: require both vars.
  if (isProduction && (!expectedUser || !expectedPass)) {
    return new NextResponse(
      "Admin panel is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.",
      { status: 503 },
    );
  }

  // Development convenience: if either var is missing, allow open access.
  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const credentials = decodeBasicAuth(req.headers.get("authorization"));
  if (!credentials) {
    return unauthorized();
  }

  const userMatches = timingSafeEqual(credentials.user, expectedUser);
  const passMatches = timingSafeEqual(credentials.pass, expectedPass);

  if (!userMatches || !passMatches) {
    return unauthorized();
  }

  return NextResponse.next();
}
