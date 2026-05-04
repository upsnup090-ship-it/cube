import { NextRequest, NextResponse } from "next/server";
import { ADMIN_GUARD_COOKIE } from "@/server/admin/admin-guard";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clear = url.searchParams.get("clear");

  if (clear === "1") {
    const response = NextResponse.redirect(new URL("/admin", request.url));
    response.cookies.set(ADMIN_GUARD_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  const expected = process.env.ADMIN_GUARD_TOKEN;
  const provided = url.searchParams.get("token");

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set(ADMIN_GUARD_COOKIE, provided, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return response;
}
