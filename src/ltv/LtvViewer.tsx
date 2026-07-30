import { useCallback, useEffect, useState } from "react";
import { parseLtvPdf2026 } from "./ltvPdfParser";
import { fetchCurrentLtv, publishLtvPdfResult } from "./ltvApi";
import {
  formatLtvDateTimeForDisplay,
  isRouteRelevant,
  LTV_FLAG_FIELDS,
  LTV_TABLE_HEADERS,
  LTV_TEXT_FIELDS_BEFORE_FLAGS,
  readLtvFileInfo,
  readLtvRowsFromFile,
} from "./ltvTypes";
import type { LtvFileInfo, LtvFlagField, LtvRow, LtvTextField } from "./ltvTypes";

type Status = "idle" | "loading" | "success" | "error";

function TextCell({ row, field }: { row: LtvRow; field: LtvTextField }) {
  return (
    <td
      style={{
        border: "1px solid #d1d5db",
        padding: "8px 6px",
        background: "#ffffff",
        color: "#111827",
        verticalAlign: "top",
        whiteSpace: "pre-line",
        overflowWrap: "anywhere",
      }}
    >
      {row[field]}
    </td>
  );
}

function FlagCell({ row, field }: { row: LtvRow; field: LtvFlagField }) {
  return (
    <td
      style={{
        border: "1px solid #d1d5db",
        padding: "8px 6px",
        background: "#ffffff",
        color: row[field] ? "#047857" : "#9ca3af",
        fontWeight: 800,
        verticalAlign: "middle",
        textAlign: "center",
      }}
    >
      {row[field] ? "✓" : ""}
    </td>
  );
}

export default function LtvViewer() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("Chargement des LTV en cours…");
  const [rows, setRows] = useState<LtvRow[]>([]);
  const [fileInfo, setFileInfo] = useState<LtvFileInfo | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("Chargement des LTV en cours…");
    const result = await fetchCurrentLtv();
    if (!result.ok) {
      setStatus("error");
      setFileInfo(null);
      setMessage(`Chargement des LTV échoué : ${result.errorMessage}`);
      return;
    }
    const nextRows = readLtvRowsFromFile(result.data);
    setRows(nextRows);
    setFileInfo(readLtvFileInfo(result.data));
    setStatus("success");
    const routeCount = nextRows.filter(isRouteRelevant).length;
    setMessage(`${routeCount} LTV sur le parcours.`);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const importPdf = useCallback(async (file: File) => {
    setStatus("loading");
    setMessage("Extraction du PDF LTV en cours…");
    try {
      const normalized = await parseLtvPdf2026(file);
      setRows(readLtvRowsFromFile(normalized));
      setFileInfo(readLtvFileInfo(normalized));
      const result = await publishLtvPdfResult(normalized);
      const routeCount = readLtvRowsFromFile(normalized).filter(isRouteRelevant).length;
      setStatus("success");
      setMessage(`${result.rowCount} LTV importées (${routeCount} sur le parcours). Fichier partagé mis à jour.`);
    } catch (error) {
      setStatus("error");
      setMessage(`Import du PDF LTV échoué : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  }, []);

  const routeRows = rows.filter(isRouteRelevant);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>LTV du parcours</div>
          <div
            style={{
              color: status === "error" ? "#991b1b" : status === "success" ? "#166534" : "#4b5563",
              fontSize: 14,
              fontWeight: status === "error" ? 600 : 400,
              lineHeight: 1.5,
              marginTop: 4,
            }}
          >
            {message}
            {fileInfo ? <> — Publié le {formatLtvDateTimeForDisplay(fileInfo.publishedAt)}</> : null}
          </div>
        </div>

        <label
          title="Importer le PDF LTV. Écrase le fichier partagé (vu par LIM et l'éditeur)."
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #16a34a",
            background: "#16a34a",
            color: "#ffffff",
            fontWeight: 700,
            cursor: status === "loading" ? "default" : "pointer",
            opacity: status === "loading" ? 0.6 : 1,
          }}
        >
          Importer un PDF LTV
          <input
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
            disabled={status === "loading"}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importPdf(file);
            }}
          />
        </label>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #d1d5db", borderRadius: 12, background: "#ffffff" }}>
        <table style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 13 }}>
          <thead>
            <tr>
              {LTV_TABLE_HEADERS.map((header) => (
                <th
                  key={header}
                  style={{
                    border: "1px solid #d1d5db",
                    background: "#f3f4f6",
                    color: "#111827",
                    padding: "8px 6px",
                    textAlign: "left",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routeRows.length === 0 ? (
              <tr>
                <td
                  colSpan={LTV_TABLE_HEADERS.length}
                  style={{ border: "1px solid #d1d5db", padding: 18, textAlign: "center", color: "#6b7280", fontWeight: 500 }}
                >
                  {status === "loading" ? "Chargement…" : "Aucune LTV sur le parcours."}
                </td>
              </tr>
            ) : (
              routeRows.map((row) => (
                <tr key={row.id}>
                  {LTV_TEXT_FIELDS_BEFORE_FLAGS.map((field) => (
                    <TextCell key={`${row.id}-${field}`} row={row} field={field} />
                  ))}
                  {LTV_FLAG_FIELDS.map((field) => (
                    <FlagCell key={`${row.id}-${field}`} row={row} field={field} />
                  ))}
                  <TextCell row={row} field="observaciones" />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
