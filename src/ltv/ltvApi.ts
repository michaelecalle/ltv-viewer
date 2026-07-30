import type { NormalizedLtvFile } from "./ltvPdfParser";

type ErrorPayload = { ok?: false; error?: { message?: string } };

function extractError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const p = payload as ErrorPayload;
    if (p.error && typeof p.error.message === "string") return p.error.message;
  }
  return fallback;
}

// Lit le fichier LTV canonique (lim-logs) via la serverless du viewer.
export async function fetchCurrentLtv(): Promise<{ ok: true; data: unknown } | { ok: false; errorMessage: string }> {
  try {
    const response = await fetch(`/api/ltv/current?t=${Date.now()}`, { method: "GET", cache: "no-store" });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok || !payload || typeof payload !== "object" || (payload as { ok?: boolean }).ok !== true) {
      return { ok: false, errorMessage: extractError(payload, `HTTP ${response.status} ${response.statusText}`) };
    }
    return { ok: true, data: (payload as { data: unknown }).data };
  } catch (error) {
    return { ok: false, errorMessage: error instanceof Error ? error.message : "Erreur réseau inconnue" };
  }
}

export type PublishLtvResponse = {
  ok: true;
  path: string;
  publishedAt: string;
  rowCount: number;
  warnings: string[];
};

// Écrit le fichier LTV canonique unique (partagé avec LIM et l'éditeur).
export async function publishLtvPdfResult(data: NormalizedLtvFile): Promise<PublishLtvResponse> {
  const response = await fetch("/api/ltv/publish-current", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ data }),
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(extractError(payload, "Impossible d'écrire le fichier LTV."));
  }
  return payload as PublishLtvResponse;
}
