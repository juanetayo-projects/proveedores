import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { ROL_LABEL } from '../lib/constantes'

const itemBase =
  'block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors'

function Item({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${itemBase} ${isActive ? 'neu-convex text-white' : 'text-[var(--azul)] hover:bg-white/60'}`
      }
    >
      {children}
    </NavLink>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [adminAbierto, setAdminAbierto] = useState(true)
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false)

  const esCoordOAdmin = perfil?.role === 'administrador' || perfil?.role === 'coordinador_administrativo'
  const puedeResponder =
    perfil?.role === 'encuestado' ||
    perfil?.role === 'orientador' ||
    perfil?.role === 'administrador' ||
    perfil?.role === 'coordinador_administrativo'

  async function salir() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[var(--neu-bg)]">
      <aside className="neu-flat m-4 flex w-64 shrink-0 flex-col gap-1 rounded-2xl p-4">
        <div className="mb-3 flex flex-col items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}images/logo_cacsb2.png`}
            alt="CAC Santa Bárbara"
            className="h-12"
          />
          <span className="text-center text-xs font-semibold text-[var(--azul)]">
            Encuestas Proveedores
          </span>
        </div>

        <div className="relative mb-3">
          <button
            onClick={() => setMenuUsuarioAbierto((v) => !v)}
            className="neu-pressed flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--azul)]">{perfil?.nombre}</div>
              <div className="text-slate-500">{perfil ? ROL_LABEL[perfil.role] : ''}</div>
            </div>
            <span
              className={`shrink-0 text-[var(--azul)] transition-transform ${menuUsuarioAbierto ? 'rotate-180' : ''}`}
            >
              ▾
            </span>
          </button>
          {menuUsuarioAbierto && (
            <div className="neu-flat absolute left-0 right-0 top-full z-10 mt-1 p-2">
              <button onClick={salir} className="neu-btn w-full py-2 text-sm font-medium text-[var(--azul)]">
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--azul-2)]">Opciones</div>
        <Item to="/">Dashboard</Item>
        {puedeResponder && <Item to="/diligenciar">Diligenciar encuesta</Item>}
        <Item to="/reportes">Reportes</Item>
        {esCoordOAdmin && <Item to="/panel-ejecutivo">Panel ejecutivo</Item>}

        {esCoordOAdmin && (
          <div className="mt-3">
            <button
              onClick={() => setAdminAbierto((v) => !v)}
              className="w-full rounded-xl px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--azul-2)]"
            >
              Administración {adminAbierto ? '▾' : '▸'}
            </button>
            {adminAbierto && (
              <div className="flex flex-col gap-1">
                <Item to="/gestion">Gestión de encuesta</Item>
                <Item to="/asignaciones">Asignaciones</Item>
                <Item to="/admin/usuarios">Usuarios</Item>
                <Item to="/admin/areas">Áreas / servicio</Item>
                <Item to="/estado-encuestas">Estado de encuestas</Item>
              </div>
            )}
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  )
}
