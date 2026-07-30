// Types et lecture du fichier LTV normalisé — version AFFICHAGE SEUL (viewer).
// Le fichier canonique est déjà normalisé : on lit les champs tels quels.

export type LtvRow = {
  id: string;
  code: string;
  section: string;
  via: string;
  kmIni: string;
  kmFin: string;
  speed: string;
  motivo: string;
  fecha1: string;
  hora1: string;
  fecha2: string;
  hora2: string;
  viaCheck: boolean;
  sistema: boolean;
  soloCabeza: boolean;
  csv: boolean;
  observaciones: string;
};

export type LtvTextField =
  | "code"
  | "section"
  | "via"
  | "kmIni"
  | "kmFin"
  | "speed"
  | "motivo"
  | "fecha1"
  | "hora1"
  | "fecha2"
  | "hora2"
  | "observaciones";

export type LtvFlagField = "viaCheck" | "sistema" | "soloCabeza" | "csv";

export type LtvFileInfo = {
  publishedAt: string;
  source: string;
  sourceUpdatedFile: string | null;
  warningCount: number;
};

export const LTV_TEXT_FIELDS_BEFORE_FLAGS: LtvTextField[] = [
  "code",
  "section",
  "via",
  "kmIni",
  "kmFin",
  "speed",
  "motivo",
  "fecha1",
  "hora1",
  "fecha2",
  "hora2",
];

export const LTV_FLAG_FIELDS: LtvFlagField[] = ["viaCheck", "sistema", "soloCabeza", "csv"];

export const LTV_TABLE_HEADERS = [
  "CÓDIGO LTV",
  "Trayecto / Estación",
  "Vía",
  "Km. Ini",
  "Km. Fin",
  "Veloc.",
  "Motivo",
  "Establecido fecha",
  "Establecido hora",
  "Fin prevista fecha",
  "Fin prevista hora",
  "No señalizada vía",
  "No señalizada sistema",
  "Sólo vehic. cabeza",
  "CSV",
  "Observaciones",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown): boolean {
  return value === true;
}

export function readLtvRowsFromFile(data: unknown): LtvRow[] {
  if (!isRecord(data) || !Array.isArray(data.rows)) return [];
  const out: LtvRow[] = [];
  data.rows.forEach((raw, index) => {
    if (!isRecord(raw)) return;
    out.push({
      id: typeof raw.id === "string" && raw.id.trim() !== "" ? raw.id : `ltv-${index + 1}`,
      code: str(raw.code),
      section: str(raw.section),
      via: str(raw.via),
      kmIni: str(raw.kmIni),
      kmFin: str(raw.kmFin),
      speed: str(raw.speed),
      motivo: str(raw.motivo),
      fecha1: str(raw.fecha1),
      hora1: str(raw.hora1),
      fecha2: str(raw.fecha2),
      hora2: str(raw.hora2),
      viaCheck: bool(raw.viaCheck),
      sistema: bool(raw.sistema),
      soloCabeza: bool(raw.soloCabeza),
      csv: bool(raw.csv),
      observaciones: str(raw.observaciones),
    });
  });
  return out;
}

export function readLtvFileInfo(data: unknown): LtvFileInfo | null {
  if (!isRecord(data) || !isRecord(data.meta)) return null;
  const meta = data.meta;
  const adif = isRecord(meta.adif) ? meta.adif : {};
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  return {
    publishedAt: str(meta.publishedAt),
    source: typeof adif.source === "string" ? adif.source : "unknown",
    sourceUpdatedFile: typeof adif.sourceUpdatedFile === "string" ? adif.sourceUpdatedFile : null,
    warningCount: warnings.length,
  };
}

export function formatLtvDateTimeForDisplay(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "—";
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed;
  return date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "medium" });
}

// Seuil PK : on n'affiche que le parcours (LTV Barcelone-Figueres, PK >= 616).
export const PK_SPLIT = 616;

function parsePk(value: string): number | null {
  const m = (value ?? "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export function isRouteRelevant(row: LtvRow): boolean {
  const a = parsePk(row.kmIni);
  const b = parsePk(row.kmFin);
  const max = Math.max(a ?? Number.NEGATIVE_INFINITY, b ?? Number.NEGATIVE_INFINITY);
  return max >= PK_SPLIT;
}
