import { publishLtvSourcePdfToLogs } from "../_lib/ltvArchive.js";
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

// Dépose le PDF SOURCE LTV (base64) dans lim-logs/ltv-normalized/current.pdf, à côté
// du normalisé. L'app cabine (LIM) l'affiche en mode secours. Non bloquant côté viewer.
export async function POST(request: Request): Promise<Response> {
  try {
    let body: { pdfBase64?: unknown };
    try {
      body = (await request.json()) as { pdfBase64?: unknown };
    } catch {
      return jsonResponse({ ok: false, error: { code: "INVALID_REQUEST", message: "Invalid JSON body" } }, 400);
    }

    if (!body || typeof body !== "object" || typeof body.pdfBase64 !== "string") {
      return jsonResponse(
        { ok: false, error: { code: "INVALID_REQUEST", message: 'Missing required body field: "pdfBase64"' } },
        400
      );
    }

    const result = await publishLtvSourcePdfToLogs(body.pdfBase64);
    return jsonResponse({ ok: true, path: result.path });
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
