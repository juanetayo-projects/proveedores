import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, Boton, Input } from '../../components/ui'
import type { Database } from '../../lib/database.types'

type Area = Database['public']['Tables']['areas_servicio']['Row']

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([])
  const [nueva, setNueva] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState<{ creadas: number; duplicadas: number; errores: string[] } | null>(null)
  const inputImportarRef = useRef<HTMLInputElement>(null)

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

  async function descargarPlantilla() {
    const { descargarPlantillaExcel } = await import('../../lib/exportar')
    await descargarPlantillaExcel(
      'plantilla_areas_servicio',
      [{ header: 'Nombre', key: 'nombre', width: 30 }],
      [{ nombre: 'Ejemplo: Cirugía' }],
    )
  }

  async function importarArchivo(file: File) {
    setImportando(true)
    setResultadoImport(null)
    const { leerExcel } = await import('../../lib/exportar')
    const filas = await leerExcel(file)
    let creadas = 0
    let duplicadas = 0
    const errores: string[] = []
    for (const f of filas) {
      const nombre = (f['Nombre'] ?? f['nombre'] ?? '').trim()
      if (!nombre) continue
      const { error } = await supabase.from('areas_servicio').insert({ nombre })
      if (error) {
        if (error.code === '23505') duplicadas++
        else errores.push(`${nombre}: ${error.message}`)
      } else {
        creadas++
      }
    }
    setImportando(false)
    setResultadoImport({ creadas, duplicadas, errores })
    cargar()
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
      <PageHeader
        titulo="Áreas / servicio"
        acciones={
          <>
            <Boton variant="secundario" onClick={descargarPlantilla}>
              Exportar plantilla
            </Boton>
            <Boton variant="secundario" onClick={() => inputImportarRef.current?.click()} disabled={importando}>
              {importando ? 'Importando…' : 'Importar'}
            </Boton>
            <input
              ref={inputImportarRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) importarArchivo(file)
              }}
            />
          </>
        }
      />
      {resultadoImport && (
        <Card className="mb-4">
          <p className="text-sm text-slate-700">
            Importación completa: <strong>{resultadoImport.creadas}</strong> área(s) creada(s)
            {resultadoImport.duplicadas > 0 && `, ${resultadoImport.duplicadas} ya existían (omitidas)`}.
          </p>
          {resultadoImport.errores.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-rose-600">
              {resultadoImport.errores.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </Card>
      )}
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
