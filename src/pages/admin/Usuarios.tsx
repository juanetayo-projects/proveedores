import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { listarAreas, listarEncuestas } from '../../lib/data'
import { PageHeader, Card, Boton, Input, Select, Modal } from '../../components/ui'
import { ROL_LABEL } from '../../lib/constantes'
import type { Database } from '../../lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Area = Database['public']['Tables']['areas_servicio']['Row']

const ROLES: Profile['role'][] = ['administrador', 'coordinador_administrativo', 'encuestado', 'orientador']

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState<{ creados: number; errores: string[] } | null>(null)
  const inputImportarRef = useRef<HTMLInputElement>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Profile | null>(null)
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    nombre: '',
    role: 'encuestado' as Profile['role'],
    area_servicio_id: '' as number | '',
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const { data } = await supabase.from('profiles').select('*').order('nombre')
    setUsuarios(data ?? [])
  }
  useEffect(() => {
    cargar()
    listarAreas().then(setAreas)
  }, [])

  function abrirNuevo() {
    setEditando(null)
    setForm({ email: '', username: '', password: '', nombre: '', role: 'encuestado', area_servicio_id: '' })
    setError(null)
    setModalAbierto(true)
  }

  function abrirEditar(u: Profile) {
    setEditando(u)
    setForm({
      email: u.email,
      username: u.username,
      password: '',
      nombre: u.nombre,
      role: u.role as Profile['role'],
      area_servicio_id: u.area_servicio_id ?? '',
    })
    setError(null)
    setModalAbierto(true)
  }

  async function guardar() {
    setError(null)
    setGuardando(true)
    try {
      if (editando) {
        const { error: err } = await supabase.functions.invoke('admin-usuarios', {
          body: {
            accion: 'actualizar',
            id: editando.id,
            nombre: form.nombre,
            username: form.username,
            role: form.role,
            area_servicio_id: form.area_servicio_id || null,
            activo: editando.activo,
          },
        })
        if (err) throw err
        if (form.password) {
          const { error: errPw } = await supabase.functions.invoke('admin-usuarios', {
            body: { accion: 'reset', id: editando.id, password: form.password },
          })
          if (errPw) throw errPw
        }
      } else {
        const { error: err, data } = await supabase.functions.invoke('admin-usuarios', {
          body: {
            accion: 'crear',
            email: form.email,
            username: form.username,
            password: form.password,
            nombre: form.nombre,
            role: form.role,
            area_servicio_id: form.area_servicio_id || null,
          },
        })
        if (err) throw err
        if (data?.error) throw new Error(data.error)
        if (form.role === 'encuestado' && data?.id) {
          const encuestas = await listarEncuestas()
          const proveedor = encuestas.filter((e) => e.tipo === 'proveedor')
          if (proveedor.length > 0) {
            await supabase
              .from('asignaciones_encuestado')
              .insert(proveedor.map((e) => ({ profile_id: data.id, encuesta_id: e.id })))
          }
        }
      }
      setModalAbierto(false)
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function descargarPlantilla() {
    const { descargarPlantillaExcel } = await import('../../lib/exportar')
    await descargarPlantillaExcel(
      'plantilla_usuarios',
      [
        { header: 'Nombre', key: 'nombre', width: 26 },
        { header: 'Usuario', key: 'usuario', width: 18 },
        { header: 'Correo', key: 'correo', width: 30 },
        { header: 'Rol', key: 'rol', width: 26 },
        { header: 'Área/servicio (opcional)', key: 'area', width: 24 },
        { header: 'Contraseña temporal', key: 'password', width: 20 },
      ],
      [
        {
          nombre: 'Ejemplo: María Pérez',
          usuario: 'maria.perez',
          correo: 'maria.perez@correo.com',
          rol: ROL_LABEL.encuestado,
          area: areas[0]?.nombre ?? '',
          password: 'Temporal123',
        },
      ],
    )
  }

  async function importarArchivo(file: File) {
    setImportando(true)
    setResultadoImport(null)
    const { leerExcel } = await import('../../lib/exportar')
    const filas = await leerExcel(file)
    const encuestasProveedor = (await listarEncuestas()).filter((e) => e.tipo === 'proveedor')
    let creados = 0
    const errores: string[] = []
    for (const f of filas) {
      const nombre = (f['Nombre'] ?? '').trim()
      const username = (f['Usuario'] ?? '').trim()
      const email = (f['Correo'] ?? '').trim()
      const rolTexto = (f['Rol'] ?? '').trim()
      const areaTexto = (f['Área/servicio (opcional)'] ?? '').trim()
      const password = (f['Contraseña temporal'] ?? '').trim()
      const etiqueta = nombre || email || username || 'fila sin datos'
      if (!nombre || !username || !email || !rolTexto || !password) {
        errores.push(`${etiqueta}: faltan campos obligatorios (nombre, usuario, correo, rol o contraseña)`)
        continue
      }
      const role = ROLES.find((r) => ROL_LABEL[r].toLowerCase() === rolTexto.toLowerCase())
      if (!role) {
        errores.push(`${etiqueta}: rol "${rolTexto}" no reconocido`)
        continue
      }
      const area = areaTexto ? areas.find((a) => a.nombre.toLowerCase() === areaTexto.toLowerCase()) : undefined
      if (areaTexto && !area) {
        errores.push(`${etiqueta}: área "${areaTexto}" no encontrada en el catálogo`)
        continue
      }
      const { error, data } = await supabase.functions.invoke('admin-usuarios', {
        body: { accion: 'crear', email, username, password, nombre, role, area_servicio_id: area?.id ?? null },
      })
      if (error || data?.error) {
        errores.push(`${etiqueta}: ${data?.error ?? error?.message ?? 'error desconocido'}`)
        continue
      }
      if (role === 'encuestado' && data?.id && encuestasProveedor.length > 0) {
        await supabase
          .from('asignaciones_encuestado')
          .insert(encuestasProveedor.map((e) => ({ profile_id: data.id, encuesta_id: e.id })))
      }
      creados++
    }
    setImportando(false)
    setResultadoImport({ creados, errores })
    cargar()
  }

  async function alternarActivo(u: Profile) {
    await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'actualizar', id: u.id, nombre: u.nombre, role: u.role, area_servicio_id: u.area_servicio_id, activo: !u.activo },
    })
    cargar()
  }

  async function eliminar(u: Profile) {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return
    await supabase.functions.invoke('admin-usuarios', { body: { accion: 'eliminar', id: u.id } })
    cargar()
  }

  return (
    <div>
      <PageHeader
        titulo="Usuarios"
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
            <Boton onClick={abrirNuevo}>Nuevo usuario</Boton>
          </>
        }
      />
      {resultadoImport && (
        <Card className="mb-4">
          <p className="text-sm text-slate-700">
            Importación completa: <strong>{resultadoImport.creados}</strong> usuario(s) creado(s).
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
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
              <th className="py-2">Nombre</th>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Área</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-slate-200">
                <td className="py-2">{u.nombre}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{ROL_LABEL[u.role]}</td>
                <td>{areas.find((a) => a.id === u.area_servicio_id)?.nombre ?? '—'}</td>
                <td>
                  <button onClick={() => alternarActivo(u)} className={u.activo ? 'text-emerald-700' : 'text-slate-400'}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="flex gap-3 py-2 text-xs">
                  <button onClick={() => abrirEditar(u)} className="text-[var(--azul-2)] hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(u)} className="text-rose-600 hover:underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)} titulo={editando ? 'Editar usuario' : 'Nuevo usuario'}>
        <div className="flex flex-col gap-3">
          <Input placeholder="Nombre completo" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input
            placeholder="Usuario (para iniciar sesión)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <Input
            type="email"
            placeholder="Correo institucional"
            value={form.email}
            disabled={!!editando}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            type="password"
            placeholder={editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Profile['role'] })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROL_LABEL[r]}
              </option>
            ))}
          </Select>
          <Select
            value={form.area_servicio_id}
            onChange={(e) => setForm({ ...form, area_servicio_id: e.target.value ? Number(e.target.value) : '' })}
          >
            <option value="">Área / servicio (opcional)</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <Boton variant="secundario" className="flex-1" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Boton>
            <Boton className="flex-1" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
