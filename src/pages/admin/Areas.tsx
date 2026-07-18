import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, Boton, Input } from '../../components/ui'
import type { Database } from '../../lib/database.types'

type Area = Database['public']['Tables']['areas_servicio']['Row']

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([])
  const [nueva, setNueva] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')

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

  function iniciarEdicion(a: Area) {
    setEditandoId(a.id)
    setNombreEditado(a.nombre)
  }

  async function guardarEdicion(id: number) {
    if (!nombreEditado.trim()) return
    const { error } = await supabase.from('areas_servicio').update({ nombre: nombreEditado.trim() }).eq('id', id)
    if (!error) {
      setEditandoId(null)
      cargar()
    }
  }

  async function eliminar(a: Area) {
    if (!confirm(`¿Eliminar "${a.nombre}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('areas_servicio').delete().eq('id', a.id)
    if (error) {
      alert('No se pudo eliminar: ya está en uso en usuarios o respuestas registradas. Puedes desactivarla en su lugar.')
      return
    }
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
          {areas.map((a) =>
            editandoId === a.id ? (
              <li key={a.id} className="neu-pressed flex items-center gap-2 px-3 py-2 text-sm">
                <Input
                  value={nombreEditado}
                  onChange={(e) => setNombreEditado(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <button onClick={() => guardarEdicion(a.id)} className="text-xs text-[var(--azul-2)] hover:underline">
                  Guardar
                </button>
                <button onClick={() => setEditandoId(null)} className="text-xs text-slate-500 hover:underline">
                  Cancelar
                </button>
              </li>
            ) : (
              <li key={a.id} className="neu-pressed flex items-center justify-between px-3 py-2 text-sm">
                <span>{a.nombre}</span>
                <div className="flex items-center gap-3 text-xs">
                  <button onClick={() => alternar(a)} className={a.activo ? 'text-emerald-700' : 'text-slate-400'}>
                    {a.activo ? 'Activa' : 'Inactiva'}
                  </button>
                  <button onClick={() => iniciarEdicion(a)} className="text-[var(--azul-2)] hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(a)} className="text-rose-600 hover:underline">
                    Eliminar
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      </Card>
    </div>
  )
}
