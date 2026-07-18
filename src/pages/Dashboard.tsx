import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { listarEncuestas } from '../lib/data'
import { PageHeader, MetricCard, Card } from '../components/ui'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']

const PUNTAJE_4: Record<string, number> = { Excelente: 4, Bueno: 3, Regular: 2, Deficiente: 1 }

export default function Dashboard() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [conteos, setConteos] = useState<Record<number, number>>({})
  const [totalRespuestas, setTotalRespuestas] = useState(0)
  const [promedioProveedores, setPromedioProveedores] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const es = await listarEncuestas()
      setEncuestas(es)

      const conteosPorEncuesta: Record<number, number> = {}
      let total = 0
      for (const e of es) {
        const { count } = await supabase
          .from('respuestas')
          .select('id', { count: 'exact', head: true })
          .eq('encuesta_id', e.id)
        conteosPorEncuesta[e.id] = count ?? 0
        total += count ?? 0
      }
      setConteos(conteosPorEncuesta)
      setTotalRespuestas(total)

      const { data: escala4 } = await supabase
        .from('respuestas_detalle')
        .select('valor, preguntas!inner(tipo_respuesta)')
        .eq('preguntas.tipo_respuesta', 'escala_4')
        .limit(5000)
      if (escala4 && escala4.length > 0) {
        const puntajes = escala4.map((r) => PUNTAJE_4[r.valor] ?? null).filter((v): v is number => v !== null)
        if (puntajes.length > 0) {
          setPromedioProveedores(puntajes.reduce((a, b) => a + b, 0) / puntajes.length)
        }
      }
    })()
  }, [])

  const dataChart = encuestas.map((e) => ({ nombre: e.proveedor ?? e.nombre, respuestas: conteos[e.id] ?? 0 }))

  return (
    <div>
      <PageHeader titulo="Dashboard" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard titulo="Encuestas activas" valor={encuestas.filter((e) => e.activa).length} />
        <MetricCard titulo="Respuestas totales" valor={totalRespuestas} />
        <MetricCard
          titulo="Calificación proveedores"
          valor={promedioProveedores ? `${promedioProveedores.toFixed(2)} / 4` : '—'}
          sub="Excelente=4 · Deficiente=1"
        />
        <MetricCard
          titulo="Respuestas Alimentación"
          valor={conteos[encuestas.find((e) => e.codigo === 'alimentacion')?.id ?? -1] ?? 0}
        />
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-[var(--azul)]">Respuestas por encuesta</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#c3cbe0" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="respuestas" fill="#16468e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
