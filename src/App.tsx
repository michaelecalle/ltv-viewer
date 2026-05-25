import { useEffect, useState } from 'react'

import LtvTable from './components/LtvTable'
import VatardTable from './components/VatardTable'

type Ltv = {
  objectId: number
  ltvId?: number
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
  dateDebutVigueur?: string | null
  heureDebutVigueur?: string | null
  dateFinPrevue?: string | null
  heureFinPrevue?: string | null
  horaire?: string | null
  nonSignaleeSysteme?: string | null
  nonSignaleeVoie?: string | null
  observations?: string | null
  vehiculeTete?: string | null
  typeTrain?: string | null
  typeTrainObs?: string | null
}

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

type AdifApiResponse = {
  ok: boolean
  source: string
  fetchedAt: string
  sourceUpdatedAt?: string | null
  total: number
  ltv: Ltv[]
}

type VatardApiResponse = {
  raw: VatardEntry[]
  stats: unknown
}

const REFERENCE_LINE = '050'
const REFERENCE_PK = 616
const VATARD_LINE = 'LÍNEA 050'

function normalizeVia(via: string): string {
  return via.trim().replace(/l/gi, 'I').toUpperCase()
}

function vatardKey(e: VatardEntry): string {
  return `${e.startKm}|${e.endKm}|${normalizeVia(e.track)}`
}

function adifKey(ltv: Ltv): string {
  return `${ltv.pkDebut.toFixed(3)}|${ltv.pkFin.toFixed(3)}|${normalizeVia(ltv.voies)}`
}

function buildVatardLookup(entries: VatardEntry[]): Map<string, VatardEntry> {
  const map = new Map<string, VatardEntry>()
  for (const e of entries) map.set(vatardKey(e), e)
  return map
}

function enrichAdifRows(rows: Ltv[], lookup: Map<string, VatardEntry>): Ltv[] {
  return rows.map((ltv) => {
    const match = lookup.get(adifKey(ltv))
    const enriched = { ...ltv } as Ltv & { _vatardFields?: Set<string>; _vatardMatched: boolean }
    enriched._vatardMatched = match != null

    if (!match) return enriched

    const vatardFields = new Set<string>()

    if (!ltv.motif?.trim() && match.reason?.trim()) {
      enriched.motif = match.reason
      vatardFields.add("motif")
    }
    if (!ltv.observations?.trim() && match.comment?.trim()) {
      enriched.observations = match.comment
      vatardFields.add("observations")
    }
    if (!ltv.csv?.trim() && match.csv === true) {
      enriched.csv = "si"
      vatardFields.add("csv")
    }

    if (vatardFields.size > 0) enriched._vatardFields = vatardFields
    return enriched
  })
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDateOnly(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOnReferenceRoute(ltv: Ltv) {
  return ltv.ligne === REFERENCE_LINE && (ltv.pkDebut >= REFERENCE_PK || ltv.pkFin >= REFERENCE_PK)
}

function isVatardOnReferenceRoute(entry: VatardEntry) {
  const kmStart = parseFloat(entry.startKm)
  const kmEnd = parseFloat(entry.endKm)
  return (Number.isFinite(kmStart) && kmStart >= REFERENCE_PK) ||
         (Number.isFinite(kmEnd) && kmEnd >= REFERENCE_PK)
}

function App() {
  const [adifData, setAdifData] = useState<AdifApiResponse | null>(null)
  const [adifLoading, setAdifLoading] = useState(false)
  const [adifError, setAdifError] = useState<string | null>(null)

  const [vatardData, setVatardData] = useState<VatardEntry[] | null>(null)
  const [vatardLoading, setVatardLoading] = useState(false)
  const [vatardError, setVatardError] = useState<string | null>(null)

  async function loadAdif() {
    setAdifLoading(true)
    setAdifError(null)
    try {
      const response = await fetch('https://lim2.vercel.app/api/ltv')
      if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`)
      const json = await response.json()
      setAdifData(json)
    } catch (err) {
      setAdifError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setAdifLoading(false)
    }
  }

  async function loadVatard() {
    setVatardLoading(true)
    setVatardError(null)
    try {
      const response = await fetch('/proxy/vatard')
      if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`)
      const json: VatardApiResponse = await response.json()
      setVatardData(json.raw ?? [])
    } catch (err) {
      setVatardError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setVatardLoading(false)
    }
  }

  async function loadAll() {
    await Promise.all([loadAdif(), loadVatard()])
  }

  useEffect(() => {
    loadAll()
  }, [])

  const vatardLine050 = vatardData?.filter((e) => e.line === VATARD_LINE) ?? []
  const vatardLookup = buildVatardLookup(vatardLine050)

  const ltvLine050 = adifData?.ltv.filter((ltv) => ltv.ligne === REFERENCE_LINE) ?? []
  const rawMainLtv = ltvLine050.filter(isOnReferenceRoute).sort((a, b) => a.pkDebut - b.pkDebut)
  const rawOtherLtv = ltvLine050.filter((ltv) => !isOnReferenceRoute(ltv)).sort((a, b) => a.pkDebut - b.pkDebut)

  const mergedMainLtv = enrichAdifRows(rawMainLtv, vatardLookup)
  const mergedOtherLtv = enrichAdifRows(rawOtherLtv, vatardLookup)

  const vatardMain = vatardLine050.filter(isVatardOnReferenceRoute).sort((a, b) => parseFloat(a.startKm) - parseFloat(b.startKm))
  const vatardOther = vatardLine050.filter((e) => !isVatardOnReferenceRoute(e)).sort((a, b) => parseFloat(a.startKm) - parseFloat(b.startKm))

  // Diagnostic : vérification croisée ADIF ↔ Vatard
  if (adifData && vatardData && vatardLine050.length > 0) {
    // 1. Entrées ADIF sans correspondance dans Vatard
    const adifUnmatched = ltvLine050.filter((ltv) => !vatardLookup.has(adifKey(ltv)))
    if (adifUnmatched.length > 0) {
      console.log(`[Diagnostic] ${adifUnmatched.length} LTV ADIF sans correspondance dans Vatard :`)
      adifUnmatched.forEach((ltv) =>
        console.log(`  LTVID=${ltv.ltvId ?? ltv.objectId} | ${ltv.pkDebut.toFixed(3)}-${ltv.pkFin.toFixed(3)} | via=${ltv.voies} | ${ltv.debutZone} - ${ltv.finZone}`)
      )
    } else {
      console.log("[Diagnostic] Toutes les LTV ADIF ont une correspondance dans Vatard.")
    }

    // 2. Entrées Vatard inactives : sont-elles absentes d'ADIF ?
    const adifKeySet = new Set(ltvLine050.map(adifKey))
    const inactiveVatard = vatardLine050.filter((e) => !e.active)
    const inactiveInAdif = inactiveVatard.filter((e) => adifKeySet.has(vatardKey(e)))
    console.log(`[Diagnostic] Vatard inactifs : ${inactiveVatard.length} | dont présents dans ADIF : ${inactiveInAdif.length}`)
    if (inactiveInAdif.length > 0) {
      console.log("  Vatard inactifs trouvés dans ADIF :")
      inactiveInAdif.forEach((e) =>
        console.log(`  ${e.startKm}-${e.endKm} | via=${e.track} | ${e.stations}`)
      )
    }
  }

  const loading = adifLoading || vatardLoading

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>LTV Viewer</h1>

      <button onClick={loadAll} disabled={loading}>
        {loading ? 'Chargement...' : 'Rafraîchir les LTV'}
      </button>

      {adifError && <p style={{ color: 'red' }}>ADIF — Erreur : {adifError}</p>}
      {vatardError && <p style={{ color: 'red' }}>Vatard — Erreur : {vatardError}</p>}

      {adifData && vatardData && (
        <>
          <p>
            <strong>Tableau fusionné</strong> — ADIF ArcGIS + Vatard — Ligne {REFERENCE_LINE}
            {' — '}Source ADIF du :{' '}
            {adifData.sourceUpdatedAt ? formatDateOnly(adifData.sourceUpdatedAt) : 'non disponible'}
            {' — '}{vatardMain.filter(e => e.active).length} LTV Vatard actives sur route de référence
          </p>

          <LtvTable
            title={`Fusionné — LTV ligne ${REFERENCE_LINE} Barcelona-Figueras (PK ≥ ${REFERENCE_PK})`}
            rows={mergedMainLtv}
          />

          <LtvTable
            title={`Fusionné — Autres LTV ligne ${REFERENCE_LINE}`}
            rows={mergedOtherLtv}
            muted
          />
        </>
      )}

      {adifData && (
        <>
          <p style={{ marginTop: '32px' }}>
            <strong>Source ADIF ArcGIS</strong> — Ligne {REFERENCE_LINE} : {ltvLine050.length} LTV
            {' — '}Téléchargées le : {formatDateTime(adifData.fetchedAt)}
          </p>

          <LtvTable
            title={`ADIF — LTV ligne ${REFERENCE_LINE} Barcelona-Figueras (PK ≥ ${REFERENCE_PK})`}
            rows={rawMainLtv}
          />

          <LtvTable
            title={`ADIF — Autres LTV ligne ${REFERENCE_LINE}`}
            rows={rawOtherLtv}
            muted
          />
        </>
      )}

      {vatardData && (
        <>
          <p style={{ marginTop: '32px' }}>
            <strong>Source Vatard</strong> — Ligne {REFERENCE_LINE} : {vatardLine050.length} LTV
            {' ('}dont {vatardMain.filter(e => e.active).length} actives sur route de référence{')'}
          </p>

          <VatardTable
            title={`Vatard — LTV ligne ${REFERENCE_LINE} Barcelona-Figueras (PK ≥ ${REFERENCE_PK})`}
            rows={vatardMain}
          />

          <VatardTable
            title={`Vatard — Autres LTV ligne ${REFERENCE_LINE}`}
            rows={vatardOther}
            muted
          />
        </>
      )}
    </div>
  )
}

export default App
