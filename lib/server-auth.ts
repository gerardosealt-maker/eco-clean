import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "cfjj_session";

function sessionToken() {
  const password = process.env.APP_PASSWORD || "";
  const secret = process.env.APP_SESSION_SECRET || password || "local";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function authRequired() {
  return Boolean(process.env.APP_PASSWORD);
}

export function isAuthenticated() {
  if (!authRequired()) return true;
  return cookies().get(COOKIE_NAME)?.value === sessionToken();
}

export function setAuthCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
