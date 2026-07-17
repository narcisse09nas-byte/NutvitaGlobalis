import {
  NextResponse,
} from "next/server";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

import {
  isSupabaseConfigured,
} from "@/lib/env";

import {
  logger,
} from "@/lib/logger";

export async function GET() {
  const startedAt =
    Date.now();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      status: "ok",
      mode: "local",
      database: "not_configured",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    });
  }

  try {
    const supabase =
      await createSupabaseServerClient();

    const { error } =
      await supabase
        .from("profiles")
        .select("id")
        .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        timestamp:
          new Date().toISOString(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    logger.error(
      "Health check failed",
      error
    );

    return NextResponse.json(
      {
        status: "degraded",
        database: "unreachable",
        timestamp:
          new Date().toISOString(),
      },
      {
        status: 503,
      }
    );
  }
}
