import { readLtvCurrentFromLogs } from "../_lib/ltvArchive.js";
import { LigneFtConfigurationError, LigneFtGithubError } from "../_lib/errors.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Lit le fichier LTV canonique (lim-logs/ltv-normalized/current.json) côté serveur
// et le renvoie au frontend du viewer.
export async function GET(): Promise<Response> {
  try {
    const data = await readLtvCurrentFromLogs();
    return jsonResponse({ ok: true, data });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonResponse(
        { ok: false, error: { code: "INVALID_JSON", message: "current.json n'est pas un JSON valide." } },
        502
      );
    }
    if (error instanceof LigneFtConfigurationError) {
      return jsonResponse({ ok: false, error: { code: "CONFIGURATION_ERROR", message: error.message } }, 500);
    }
    if (error instanceof LigneFtGithubError) {
      return jsonResponse(
        { ok: false, error: { code: "GITHUB_ERROR", message: error.message, details: error.details } },
        502
      );
    }
    return jsonResponse(
      { ok: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Erreur interne" } },
      500
    );
  }
}
