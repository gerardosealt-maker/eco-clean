export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "../../../lib/server-auth";
import { isCloudConfigured, readCloudState, writeCloudState } from "../../../lib/supabase-state";
import type { AppData } from "../../../lib/types";

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  if (!isCloudConfigured()) {
    return NextResponse.json({ mode: "local", data: null });
  }

  const data = await readCloudState();
  return NextResponse.json({ mode: "cloud", data });
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  if (!isCloudConfigured()) return NextResponse.json({ message: "Modo local activo" }, { status: 501 });

  const body = (await request.json()) as { data?: AppData };
  if (!body.data || body.data.version !== 3) {
    return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });
  }

  await writeCloudState(body.data);
  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}
