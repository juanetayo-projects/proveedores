import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, Boton, Input } from '../../components/ui'
import type { Database } from '../../lib/database.types'

type Area = Database['public']['Tables']['areas_servicio']['Row']

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([])
  const [nueva, setNueva] = useState('')

  async function cargar() {
    const { data } = await supabase.from('areas_servicio').select('*').order('nombre')
    setAreas(data ?? [])
  }
  useEffect(() => {
    cargar()
  }, [])

  async function agregar() {
    if (!nueva.trim()) return
    const { error } = await supabase.from('areas_servicio').insert({ nombre: nueva.trim() })
    if (!error) {
      setNueva('')
      cargar()
    }
  }

  async function alternar(a: Area) {
    await supabase.from('areas_servicio').update({ activo: !a.activo }).eq('id', a.id)
    cargar()
  }

  return (
    <div>
      <PageHeader titulo="Áreas / servicio" />
      <Card>
        <div className="mb-4 flex gap-2">
          <Input placeholder="Nueva área o servicio" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <Boton onClick={agregar}>Agregar</Boton>
        </div>
        <ul className="flex flex-col gap-2">
          {areas.map((a) => (
            <li key={a.id} className="neu-pressed flex items-center justify-between px-3 py-2 text-sm">
              {a.nombre}
              <button
                onClick={() => alternar(a)}
                className={a.activo ? 'text-emerald-700' : 'text-slate-400'}
              >
                {a.activo ? 'Activa' : 'Inactiva'}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
