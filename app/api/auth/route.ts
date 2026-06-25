export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authRequired, clearAuthCookie, isAuthenticated, setAuthCookie } from "../../../lib/server-auth";

export async function GET() {
  return NextResponse.json({ authenticated: isAuthenticated(), required: authRequired() });
}

export async function POST(request: NextRequest) {
  if (!authRequired()) return NextResponse.json({ ok: true });

  const body = await request.json().catch(() => ({}));
  const password = String(body.password || "");

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ ok: false, message: "Contraseña incorrecta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setAuthCookie(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookie(response);
  return response;
}
