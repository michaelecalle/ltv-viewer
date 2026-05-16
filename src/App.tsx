import { useEffect, useState } from 'react'

import LtvTable from './components/LtvTable'

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

type ApiResponse = {
  ok: boolean
  source: string
  fetchedAt: string
  sourceUpdatedAt?: string | null
  total: number
  ltv: Ltv[]
}

const REFERENCE_LINE = '050'
const REFERENCE_PK = 616



function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatDateOnly(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isOnReferenceRoute(ltv: Ltv) {
  return ltv.ligne === REFERENCE_LINE && (ltv.pkDebut >= REFERENCE_PK || ltv.pkFin >= REFERENCE_PK)
}

function App() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadLtv() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('https://lim2.vercel.app/api/ltv')

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLtv()
  }, [])

  const ltvLine050 = data?.ltv.filter((ltv) => ltv.ligne === REFERENCE_LINE) ?? []
  const mainLtv = ltvLine050.filter(isOnReferenceRoute)
  const otherLtv = ltvLine050.filter((ltv) => !isOnReferenceRoute(ltv))

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>LTV Viewer</h1>

      <button onClick={loadLtv} disabled={loading}>
        {loading ? 'Chargement...' : 'Rafraîchir les LTV'}
      </button>

      {error && <p style={{ color: 'red' }}>Erreur : {error}</p>}

      {data && (
        <>
          <p>
            LTV ligne {REFERENCE_LINE} : {ltvLine050.length}
            {' — '}Données source ADIF du :{' '}
            {data.sourceUpdatedAt ? formatDateOnly(data.sourceUpdatedAt) : 'non disponible'}
            {' — '}Téléchargées le : {formatDateTime(data.fetchedAt)}
          </p>

        <LtvTable
          title={`LTV ligne ${REFERENCE_LINE} Barcelona-Figueras`}
          rows={mainLtv}
        />

        <LtvTable
          title={`Autres LTV ligne ${REFERENCE_LINE}`}
          rows={otherLtv}
          muted
        />
        </>
      )}
    </div>
  )
}

export default App