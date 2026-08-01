import { publishLtvCurrentToLogs } from "../_lib/ltvArchive.js";
import {
  LigneFtConfigurationError,
  LigneFtGithubError,
  LigneFtValidationError,
} from "../_lib/errors.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Écrit le fichier LTV canonique unique (lim-logs/ltv-normalized/current.json),
// celui que l'app cabine, l'éditeur et ce viewer partagent.
export async function POST(request: Request): Promise<Response> {
  try {
    let body: { data?: unknown };
    try {
      body = (await request.json()) as { data?: unknown };
    } catch {
      return jsonResponse({ ok: false, error: { code: "INVALID_REQUEST", message: "Invalid JSON body" } }, 400);
    }

    if (!body || typeof body !== "object" || !("data" in body)) {
      return jsonResponse(
        { ok: false, error: { code: "INVALID_REQUEST", message: 'Missing required body field: "data"' } },
        400
      );
    }

    const result = await publishLtvCurrentToLogs(body.data);
    return jsonResponse({
      ok: true,
      path: result.path,
      publishedAt: result.publishedAt,
      rowCount: result.rowCount,
      warnings: result.warnings,
      written: result.written,
    });
  } catch (error) {
    if (error instanceof LigneFtValidationError) {
      return jsonResponse(
        { ok: false, error: { code: "VALIDATION_ERROR", message: error.message, details: error.details } },
        422
      );
    }
    if (error instanceof LigneFtConfigurationError) {
      return jsonResponse(
        { ok: false, error: { code: "CONFIGURATION_ERROR", message: error.message, details: error.details } },
        500
      );
    }
    if (error instanceof LigneFtGithubError) {
      return jsonResponse(
        { ok: false, error: { code: "GITHUB_ERROR", message: error.message, details: error.details } },
        500
      );
    }
    return jsonResponse(
      { ok: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown internal error" } },
      500
    );
  }
}
