import { LigneFtValidationError } from "./errors.js";
import { githubGetFile, githubGetFileMeta, githubPutFile, githubPutFileBase64, githubTryGetFile } from "./github.js";

// Fichier LTV canonique UNIQUE, partagé : lu par l'app cabine (runtime), l'éditeur
// et ce viewer ; écrit ici quand un PDF est importé dans le viewer.
const LTV_CURRENT_LOGS_PATH = "ltv-normalized/current.json";

// PDF SOURCE LTV, déposé À CÔTÉ du normalisé. L'app cabine (LIM) l'affiche en mode
// secours (bascule fiche train ↔ LTV). Toujours « le plus récent ».
const LTV_CURRENT_PDF_LOGS_PATH = "ltv-normalized/current.pdf";

type LtvNormalizedPayload = {
  meta: { line: string; publishedAt?: string; adif?: unknown };
  rows: unknown[];
  warnings?: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertValid(data: unknown): asserts data is LtvNormalizedPayload {
  if (!isRecord(data)) {
    throw new LigneFtValidationError("Le fichier LTV normalisé doit être un objet JSON.");
  }
  if (!isRecord(data.meta)) {
    throw new LigneFtValidationError("Le fichier LTV normalisé doit contenir un objet meta.");
  }
  if (typeof data.meta.line !== "string" || data.meta.line.trim() === "") {
    throw new LigneFtValidationError("Le fichier LTV normalisé doit contenir meta.line.");
  }
  if (!Array.isArray(data.rows)) {
    throw new LigneFtValidationError("Le fichier LTV normalisé doit contenir un tableau rows.");
  }
  if ("warnings" in data && !Array.isArray(data.warnings)) {
    throw new LigneFtValidationError("Le champ warnings doit être un tableau.");
  }
}

function normalizeWarnings(warnings: unknown[] | undefined): string[] {
  if (!Array.isArray(warnings)) return [];
  return warnings
    .filter((w): w is string => typeof w === "string")
    .map((w) => w.trim())
    .filter((w) => w !== "");
}

export async function publishLtvCurrentToLogs(
  data: unknown
): Promise<{ path: string; publishedAt: string; rowCount: number; warnings: string[]; written: boolean }> {
  assertValid(data);

  // On préserve meta.publishedAt (date de vigueur du PDF, posée par le parseur).
  const publishedAt =
    typeof data.meta.publishedAt === "string" && data.meta.publishedAt.trim() !== ""
      ? data.meta.publishedAt
      : new Date().toISOString();

  const warnings = normalizeWarnings(data.warnings);

  // « Le plus récent par DATE DE CONTENU (Fecha Vigor) gagne », pas le plus récemment
  // envoyé. On ne réécrit que si la date entrante est STRICTEMENT plus récente que
  // celle du normalisé déjà stocké (ou s'il n'y en a pas encore).
  const existing = await githubTryGetFile(LTV_CURRENT_LOGS_PATH);
  let existingSha: string | undefined;
  if (existing) {
    existingSha = existing.sha;
    const newDate = Date.parse(publishedAt) || 0;
    let existingDate = 0;
    try {
      const parsed = JSON.parse(existing.content) as { meta?: { publishedAt?: string } };
      existingDate = Date.parse(parsed?.meta?.publishedAt ?? "") || 0;
    } catch {
      existingDate = 0;
    }
    if (newDate > 0 && existingDate > 0 && newDate <= existingDate) {
      // Déjà à jour (ou plus ancien) → on n'écrase pas.
      return { path: LTV_CURRENT_LOGS_PATH, publishedAt, rowCount: data.rows.length, warnings, written: false };
    }
  }

  const nextContent = `${JSON.stringify({ ...data, warnings }, null, 2)}\n`;
  const result = await githubPutFile(
    LTV_CURRENT_LOGS_PATH,
    nextContent,
    "Import LTV depuis le viewer (PDF)",
    existingSha
  );

  return { path: result.path, publishedAt, rowCount: data.rows.length, warnings, written: true };
}

export async function readLtvCurrentFromLogs(): Promise<unknown> {
  const file = await githubGetFile(LTV_CURRENT_LOGS_PATH);
  return JSON.parse(file.content);
}

// Dépose le PDF source LTV (base64) à côté du normalisé. Il SUIT la décision de date
// du normalisé : `force` = le normalisé vient d'être (ré)écrit car sa Fecha Vigor est
// plus récente. On écrit le PDF si `force` OU s'il n'existe pas encore (rattrapage).
// Sinon on n'y touche pas → « le plus récent par date de contenu » reste en place.
export async function publishLtvSourcePdfToLogs(
  base64Pdf: unknown,
  opts: { force: boolean }
): Promise<{ path: string; skipped: boolean }> {
  if (typeof base64Pdf !== "string" || base64Pdf.trim() === "") {
    throw new LigneFtValidationError("Le PDF source LTV (base64) est requis.");
  }
  const existing = await githubGetFileMeta(LTV_CURRENT_PDF_LOGS_PATH);
  if (!opts.force && existing) {
    // Le normalisé n'a pas changé et le PDF est déjà là → rien à faire.
    return { path: LTV_CURRENT_PDF_LOGS_PATH, skipped: true };
  }
  const result = await githubPutFileBase64(
    LTV_CURRENT_PDF_LOGS_PATH,
    base64Pdf,
    "Import PDF source LTV depuis le viewer",
    existing?.sha ?? undefined
  );
  return { path: result.path, skipped: false };
}
