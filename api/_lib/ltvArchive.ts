import { LigneFtValidationError } from "./errors.js";
import { githubGetFile, githubGetFileSha, githubPutFile, githubPutFileBase64 } from "./github.js";

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
): Promise<{ path: string; publishedAt: string; rowCount: number; warnings: string[] }> {
  assertValid(data);

  // On préserve meta.publishedAt (date de vigueur du PDF, posée par le parseur).
  const publishedAt =
    typeof data.meta.publishedAt === "string" && data.meta.publishedAt.trim() !== ""
      ? data.meta.publishedAt
      : new Date().toISOString();

  const warnings = normalizeWarnings(data.warnings);
  const nextContent = `${JSON.stringify({ ...data, warnings }, null, 2)}\n`;

  const existingSha = await githubGetFileSha(LTV_CURRENT_LOGS_PATH);
  const result = await githubPutFile(
    LTV_CURRENT_LOGS_PATH,
    nextContent,
    "Import LTV depuis le viewer (PDF)",
    existingSha ?? undefined
  );

  return { path: result.path, publishedAt, rowCount: data.rows.length, warnings };
}

export async function readLtvCurrentFromLogs(): Promise<unknown> {
  const file = await githubGetFile(LTV_CURRENT_LOGS_PATH);
  return JSON.parse(file.content);
}

// Dépose le PDF source LTV (fourni en base64) à côté du normalisé. « Le plus récent
// gagne » : on récupère le sha existant et on écrase. Non bloquant côté appelant.
export async function publishLtvSourcePdfToLogs(base64Pdf: unknown): Promise<{ path: string }> {
  if (typeof base64Pdf !== "string" || base64Pdf.trim() === "") {
    throw new LigneFtValidationError("Le PDF source LTV (base64) est requis.");
  }
  const existingSha = await githubGetFileSha(LTV_CURRENT_PDF_LOGS_PATH);
  const result = await githubPutFileBase64(
    LTV_CURRENT_PDF_LOGS_PATH,
    base64Pdf,
    "Import PDF source LTV depuis le viewer",
    existingSha ?? undefined
  );
  return { path: result.path };
}
