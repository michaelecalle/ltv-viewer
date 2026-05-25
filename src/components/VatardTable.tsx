type VatardEntry = {
  code: string
  stations: string
  track: string
  startKm: string
  endKm: string
  speed: string
  speedNum: number
  reason: string
  startDateTime: string
  endDateTime: string
  csv: boolean
  comment: string
  firstAppearanceDate: string
  lastSeen: string
  active: boolean
  designSpeed: number
  reductionPercentage: number
  kmLength: number
  line: string
}

type VatardTableProps = {
  title: string
  rows: VatardEntry[]
  muted?: boolean
}

function formatVatardDateTime(value: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
}

function formatVatardDate(value: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function VatardTable({ title, rows, muted = false }: VatardTableProps) {
  return (
    <section className={muted ? "ltv-section ltv-section-muted" : "ltv-section"}>
      <style>{`
        .ltv-section { margin-top: 18px; }
        .ltv-section-muted { opacity: 0.62; }
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
          background: #c7e0c7;
          color: #000;
          font-weight: 700;
          font-size: 15px;
          border: 2px solid #000;
          border-bottom: 0;
          letter-spacing: 0.3px;
          padding: 4px 0;
          line-height: 1.05;
        }
        .ltv-th, .ltv-td {
          border: 2px solid #000;
          color: #000;
          background: #fff;
          font-size: 9px;
          line-height: 1.05;
          text-align: center;
          font-weight: 600;
          padding: 1px;
          overflow: hidden;
        }
        .ltv-th.left { text-align: left; font-weight: 700; }
        .ltv-th.vert, .ltv-td.vert {
          font-size: 8px;
          font-weight: 600;
          line-height: 1.05;
          text-align: center;
          white-space: nowrap;
          vertical-align: middle;
          padding: 0 2px;
        }
        .vert-shell {
          position: relative;
          height: 55px;
          width: 100%;
          display: block;
        }
        .vert-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-90deg);
          transform-origin: center center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          line-height: 1.05;
          font-weight: 600;
          text-align: center;
          max-width: 100%;
        }
        .vert-label-2l { line-height: 1.1; }
        col.vat-trayecto  { width: 20%; }
        col.vat-via       { width: 2.5%; }
        col.vat-km        { width: 4%; }
        col.vat-vdis      { width: 3.5%; }
        col.vat-vel       { width: 3.5%; }
        col.vat-red       { width: 3%; }
        col.vat-motivo    { width: 13%; }
        col.vat-desde     { width: 6.5%; }
        col.vat-hasta     { width: 6.5%; }
        col.vat-csv       { width: 2.5%; }
        col.vat-activa    { width: 3%; }
        col.vat-date      { width: 5%; }
        col.vat-comment   { width: 17%; }
      `}</style>

      <table className="ltv-table">
        <caption>{title}</caption>

        <colgroup>
          <col className="vat-trayecto" />
          <col className="vat-via" />
          <col className="vat-km" />
          <col className="vat-km" />
          <col className="vat-vdis" />
          <col className="vat-vel" />
          <col className="vat-red" />
          <col className="vat-motivo" />
          <col className="vat-desde" />
          <col className="vat-hasta" />
          <col className="vat-csv" />
          <col className="vat-activa" />
          <col className="vat-date" />
          <col className="vat-date" />
          <col className="vat-comment" />
        </colgroup>

        <thead>
          <tr>
            <th className="ltv-th left" rowSpan={2}>Trayecto / Estación</th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label">Vía</span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label">Km. Ini</span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label">Km. Fin</span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label vert-label-2l"><span>V.</span><span>Dis.</span></span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label">Veloc.</span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label vert-label-2l"><span>Réd.</span><span>%</span></span></div>
            </th>
            <th className="ltv-th" rowSpan={2}>Motivo</th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label vert-label-2l"><span>Desde</span></span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label vert-label-2l"><span>Hasta</span></span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label">CSV</span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label">Activa</span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label vert-label-2l"><span>1ª</span><span>Appar.</span></span></div>
            </th>
            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label vert-label-2l"><span>Ult.</span><span>visto</span></span></div>
            </th>
            <th className="ltv-th" rowSpan={2}>Comentario</th>
          </tr>
          <tr />
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.code} style={{ color: "#2563eb" }}>
              <td className="ltv-td" style={{ textAlign: "left" }}>{row.stations}</td>
              <td className="ltv-td">{row.track}</td>
              <td className="ltv-td">{row.startKm}</td>
              <td className="ltv-td">{row.endKm}</td>
              <td className="ltv-td">{row.designSpeed}</td>
              <td className="ltv-td">{row.speedNum}</td>
              <td className="ltv-td">{row.reductionPercentage > 0 ? `-${row.reductionPercentage}%` : ""}</td>
              <td className="ltv-td" style={{ textAlign: "left" }}>{row.reason}</td>
              <td className="ltv-td">{formatVatardDateTime(row.startDateTime)}</td>
              <td className="ltv-td">{formatVatardDateTime(row.endDateTime)}</td>
              <td className="ltv-td">{row.csv ? "✓" : ""}</td>
              <td className="ltv-td" style={{ color: row.active ? "#16a34a" : "#9ca3af" }}>{row.active ? "✓" : "—"}</td>
              <td className="ltv-td">{formatVatardDate(row.firstAppearanceDate)}</td>
              <td className="ltv-td">{formatVatardDate(row.lastSeen)}</td>
              <td className="ltv-td" style={{ textAlign: "left" }}>{row.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
