import { useCallback, useEffect, useState } from "react";
import { parseLtvPdf2026 } from "./ltvPdfParser";
import { fetchCurrentLtv, publishLtvPdfResult, publishLtvSourcePdf } from "./ltvApi";
import {
  isRouteRelevant,
  readLtvFileInfo,
  readLtvRowsFromFile,
} from "./ltvTypes";
import type { LtvFileInfo, LtvRow } from "./ltvTypes";

type Status = "idle" | "loading" | "success" | "error";

// Mise en forme reprise de l'application LIM (tableau compact, bordé, en-têtes
// verticaux) — pensée pour la CONSULTATION (iPad), pas l'édition.
const TABLE_CSS = `
  .ltv-wrap { background: transparent; }
  .ltv-table {
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
    border: 2px solid #000;
    background: #fff;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    color: #000;
  }
  .ltv-table caption {
    caption-side: top;
    background: #dedede;
    color: #000;
    font-weight: 700;
    font-size: 15px;
    border: 2px solid #000;
    border-bottom: 0;
    letter-spacing: 0.3px;
    padding: 4px 8px;
    line-height: 1.1;
    text-align: center;
  }
  .ltv-th, .ltv-td {
    border: 2px solid #000;
    color: #000;
    background: #fff;
    font-size: 11.5px;
    line-height: 1.15;
    text-align: center;
    font-weight: 600;
  }
  .ltv-th.vert, .ltv-td.vert {
    font-size: 10.5px;
    font-weight: 600;
    line-height: 1.05;
    text-align: center;
    white-space: nowrap;
    vertical-align: middle;
    padding: 0 2px;
  }
  .vert-shell { position: relative; height: 55px; width: 100%; display: block; }
  .vert-label {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    transform-origin: center center;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    white-space: nowrap; line-height: 1.05;
    font-weight: 600; text-align: center; max-width: 100%;
  }
  .vert-label-2l { line-height: 1.1; }
  .ltv-th.left { text-align: left; font-weight: 700; }

  col.ltv-col-trayecto  { width: 21.43%; }
  col.ltv-col-via       { width: 2.23%; }
  col.ltv-col-km        { width: 3.79%; }
  col.ltv-col-km2       { width: 3.68%; }
  col.ltv-col-vel       { width: 3.35%; }
  col.ltv-col-motivo    { width: 16.18%; }
  col.ltv-col-small-a   { width: 5.13%; }
  col.ltv-col-small-b   { width: 2.90%; }
  col.ltv-col-small-c   { width: 4.80%; }
  col.ltv-col-small-d   { width: 3.13%; }
  col.ltv-col-small-e   { width: 6.03%; }
  col.ltv-col-small-f   { width: 6.03%; }
  col.ltv-col-solo      { width: 3.13%; }
  col.ltv-col-csv-narrow { width: 2.34%; }
  col.ltv-col-csv       { width: 15.85%; }

  .ltv-empty-cell { background: #dedede; border: 2px solid #000; height: 36px; }

  @media print {
    .ltv-th, .ltv-td { font-size: 10.5px; }
    .ltv-th.vert, .ltv-td.vert { font-size: 10px; }
    .ltv-table caption { font-size: 14px; padding: 3px 0; }
  }
`;

const check = (v: boolean) => (v ? "✓" : "");

// Format d'actualisation identique à l'app LIM : "3 juin 2026 à 15h00".
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function formatLtvUpdateDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()} à ${hh}h${mm}`;
}

function Row({ r, idx }: { r: LtvRow; idx: number }) {
  return (
    <tr key={r.code + "_" + idx}>
      <td className="ltv-td" style={{ textAlign: "left", fontWeight: 600, lineHeight: 1.2, whiteSpace: "pre-line" }}>
        {`(${r.code}) ${r.section}`}
      </td>
      <td className="ltv-td">{r.via}</td>
      <td className="ltv-td" style={{ fontSize: "9.5px", lineHeight: 1.05, letterSpacing: "-0.35px", whiteSpace: "nowrap" }}>{r.kmIni}</td>
      <td className="ltv-td" style={{ fontSize: "9.5px", lineHeight: 1.05, letterSpacing: "-0.35px", whiteSpace: "nowrap" }}>{r.kmFin}</td>
      <td className="ltv-td">{r.speed}</td>
      <td className="ltv-td" style={{ textAlign: "left" }}>{r.motivo}</td>
      <td className="ltv-td">{r.fecha1}</td>
      <td className="ltv-td">{r.hora1}</td>
      <td className="ltv-td">{r.fecha2}</td>
      <td className="ltv-td">{r.hora2}</td>
      <td className="ltv-td">{check(r.viaCheck)}</td>
      <td className="ltv-td">{check(r.sistema)}</td>
      <td className="ltv-td">{check(r.soloCabeza)}</td>
      <td className="ltv-td">{check(r.csv)}</td>
      <td className="ltv-td" style={{ textAlign: "left", whiteSpace: "pre-line" }}>{r.observaciones}</td>
    </tr>
  );
}

// File binaire → base64 (par chunks : String.fromCharCode(...tout) déborderait la pile
// sur un gros PDF).
async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
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
    setRows(readLtvRowsFromFile(result.data));
    setFileInfo(readLtvFileInfo(result.data));
    setStatus("success");
    setMessage("");
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
      // Déposer aussi le PDF source LTV (pour l'affichage en mode secours de LIM).
      // Non bloquant : l'import est déjà réussi, ce dépôt est best-effort.
      void fileToBase64(file)
        .then((b64) => publishLtvSourcePdf(b64))
        .catch(() => {});
      setStatus("success");
      setMessage(`${result.rowCount} LTV importées. Fichier partagé mis à jour.`);
    } catch (error) {
      setStatus("error");
      setMessage(`Import du PDF LTV échoué : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  }, []);

  const routeRows = rows.filter(isRouteRelevant);
  const updateDate = fileInfo ? formatLtvUpdateDate(fileInfo.publishedAt) : "";
  const caption = `${routeRows.length} LTV` + (updateDate ? ` - Actualisées le ${updateDate}` : "");

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 12, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div
          style={{
            color: status === "error" ? "#991b1b" : status === "success" ? "#166534" : "#4b5563",
            fontSize: 13,
            fontWeight: status === "error" ? 600 : 400,
            minHeight: 18,
          }}
        >
          {message}
        </div>
        <label
          title="Importer le PDF LTV. Écrase le fichier partagé (vu par LIM et l'éditeur)."
          style={{
            padding: "9px 14px",
            borderRadius: 10,
            border: "1px solid #16a34a",
            background: "#16a34a",
            color: "#ffffff",
            fontWeight: 700,
            cursor: status === "loading" ? "default" : "pointer",
            opacity: status === "loading" ? 0.6 : 1,
            whiteSpace: "nowrap",
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

      <section className="ltv-wrap">
        <style>{TABLE_CSS}</style>
        <table className="ltv-table">
          <caption>{caption}</caption>
          <colgroup>
            <col className="ltv-col-trayecto" />
            <col className="ltv-col-via" />
            <col className="ltv-col-km" />
            <col className="ltv-col-km2" />
            <col className="ltv-col-vel" />
            <col className="ltv-col-motivo" />
            <col className="ltv-col-small-a" />
            <col className="ltv-col-small-b" />
            <col className="ltv-col-small-c" />
            <col className="ltv-col-small-d" />
            <col className="ltv-col-small-e" />
            <col className="ltv-col-small-f" />
            <col className="ltv-col-solo" />
            <col className="ltv-col-csv-narrow" />
            <col className="ltv-col-csv" />
          </colgroup>
          <thead>
            <tr>
              <th className="ltv-th left" rowSpan={2}>(CÓDIGO LTV) Trayecto / Estación</th>
              <th className="ltv-th vert" rowSpan={2}><div className="vert-shell"><span className="vert-label">Vía</span></div></th>
              <th className="ltv-th vert" rowSpan={2}><div className="vert-shell"><span className="vert-label">Km. Ini</span></div></th>
              <th className="ltv-th vert" rowSpan={2}><div className="vert-shell"><span className="vert-label">Km. Fin</span></div></th>
              <th className="ltv-th vert" rowSpan={2}><div className="vert-shell"><span className="vert-label">Veloc.</span></div></th>
              <th className="ltv-th" rowSpan={2}>Motivo</th>
              <th className="ltv-th" colSpan={2}>Establecido</th>
              <th className="ltv-th" colSpan={2}>Fin prevista</th>
              <th className="ltv-th" colSpan={2}>No señalizada</th>
              <th className="ltv-th vert" rowSpan={2}><div className="vert-shell"><span className="vert-label vert-label-2l"><span>Sólo vehic.</span><span>Cabeza</span></span></div></th>
              <th className="ltv-th vert" rowSpan={2}><div className="vert-shell"><span className="vert-label">CSV</span></div></th>
              <th className="ltv-th" rowSpan={2}>Observaciones</th>
            </tr>
            <tr>
              <th className="ltv-th vert"><div className="vert-shell"><span className="vert-label">Fecha</span></div></th>
              <th className="ltv-th vert"><div className="vert-shell"><span className="vert-label">Hora</span></div></th>
              <th className="ltv-th vert"><div className="vert-shell"><span className="vert-label">Fecha</span></div></th>
              <th className="ltv-th vert"><div className="vert-shell"><span className="vert-label">Hora</span></div></th>
              <th className="ltv-th vert"><div className="vert-shell"><span className="vert-label">Vía</span></div></th>
              <th className="ltv-th vert"><div className="vert-shell"><span className="vert-label">Sistema</span></div></th>
            </tr>
          </thead>
          <tbody>
            {routeRows.length === 0 ? (
              <tr>
                <td className="ltv-empty-cell" colSpan={15} style={{ textAlign: "center", fontWeight: 500 }}>
                  {status === "loading" ? "Chargement…" : "Aucune LTV sur le parcours."}
                </td>
              </tr>
            ) : (
              routeRows.map((r, idx) => <Row key={r.code + "_" + idx} r={r} idx={idx} />)
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
