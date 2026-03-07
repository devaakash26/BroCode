import { NextResponse } from "next/server";

// Simple health check — the actual socket-health endpoint is served by server-dev.js/server.js
// at the Express level. This Next.js route is a fallback for environments where the
// custom server is not running.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    serverTime: new Date().toISOString(),
    note: "For full socket status, check /socket-health (served by custom server)",
  });
}

export const dynamic = "force-dynamic";
