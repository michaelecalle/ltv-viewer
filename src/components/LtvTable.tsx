type LtvEntry = {
  objectId: number
  ltvId?: number | null
  ligne: string
  ligneDescription?: string
  pkDebut: number
  pkFin: number
  vitesse: number
  voies: string
  motif: string
  debutZone: string
  finZone: string

  csv?: string | null
  calendrier?: string | null
  dateDebutVigueur?: number | string | null
  heureDebutVigueur?: string | null
  dateFinPrevue?: number | string | null
  heureFinPrevue?: string | null
  horaire?: string | null
  nonSignaleeSysteme?: string | null
  nonSignaleeVoie?: string | null
  observations?: string | null
  vehiculeTete?: string | null
  typeTrain?: string | null
  typeTrainObs?: string | null
}

type LtvTableProps = {
  title: string
  rows: LtvEntry[]
  muted?: boolean
}

function formatPk(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : ""
}

function formatAdifDate(value?: number | string | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return ""

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function checkSi(value?: string | null): string {
  return String(value ?? "").trim().toLowerCase() === "si" ? "✓" : ""
}

export default function LtvTable({ title, rows, muted = false }: LtvTableProps) {
  return (
    <section className={muted ? "ltv-section ltv-section-muted" : "ltv-section"}>
      <style>{`
        .ltv-section {
          margin-top: 18px;
        }

        .ltv-section-muted {
          opacity: 0.62;
        }

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
          padding: 4px 0;
          line-height: 1.05;
        }

        .ltv-th,
        .ltv-td {
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

        .ltv-th.left {
          text-align: left;
          font-weight: 700;
        }

        .ltv-th.vert,
        .ltv-td.vert {
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

        .vert-label-2l {
          line-height: 1.1;
        }

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
      `}</style>

      <table className="ltv-table">
        <caption>{title}</caption>

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
            <th className="ltv-th left" rowSpan={2}>
              (CÓDIGO LTV) Trayecto / Estación
            </th>

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
              <div className="vert-shell"><span className="vert-label">Veloc.</span></div>
            </th>

            <th className="ltv-th" rowSpan={2}>Motivo</th>
            <th className="ltv-th" colSpan={2}>Establecido</th>
            <th className="ltv-th" colSpan={2}>Fin prevista</th>
            <th className="ltv-th" colSpan={2}>No señalizada</th>

            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell">
                <span className="vert-label vert-label-2l">
                  <span>Sólo vehic.</span>
                  <span>Cabeza</span>
                </span>
              </div>
            </th>

            <th className="ltv-th vert" rowSpan={2}>
              <div className="vert-shell"><span className="vert-label">CSV</span></div>
            </th>

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
          {rows.map((row) => (
            <tr key={row.objectId}>
              <td className="ltv-td" style={{ textAlign: "left", whiteSpace: "pre-line" }}>
                {`(${row.ltvId ?? row.objectId}) ${row.debutZone} - ${row.finZone}`}
              </td>
              <td className="ltv-td">{row.voies}</td>
              <td className="ltv-td">{formatPk(row.pkDebut)}</td>
              <td className="ltv-td">{formatPk(row.pkFin)}</td>
              <td className="ltv-td">{row.vitesse}</td>
              <td className="ltv-td" style={{ textAlign: "left" }}>{row.motif}</td>
              <td className="ltv-td">{formatAdifDate(row.dateDebutVigueur)}</td>
              <td className="ltv-td">{row.heureDebutVigueur ?? ""}</td>
              <td className="ltv-td">{formatAdifDate(row.dateFinPrevue)}</td>
              <td className="ltv-td">{row.heureFinPrevue ?? ""}</td>
              <td className="ltv-td">{checkSi(row.nonSignaleeVoie)}</td>
              <td className="ltv-td">{checkSi(row.nonSignaleeSysteme)}</td>
              <td className="ltv-td">{checkSi(row.vehiculeTete)}</td>
              <td className="ltv-td">{checkSi(row.csv)}</td>
              <td className="ltv-td" style={{ textAlign: "left", whiteSpace: "pre-line" }}>
                {[row.observations, row.typeTrainObs].filter(Boolean).join("\n")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}