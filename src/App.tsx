import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, type Rol } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Reset from './pages/Reset'
import Dashboard from './pages/Dashboard'
import DiligenciarEncuesta from './pages/DiligenciarEncuesta'
import GestionEncuesta from './pages/GestionEncuesta'
import Asignaciones from './pages/Asignaciones'
import EstadoEncuestas from './pages/EstadoEncuestas'
import Reportes from './pages/Reportes'
import PanelEjecutivo from './pages/PanelEjecutivo'
import Usuarios from './pages/admin/Usuarios'
import Areas from './pages/admin/Areas'

function Guard({ roles, children }: { roles?: Rol[]; children: React.ReactElement }) {
  const { session, perfil, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />
  if (roles && perfil && !roles.includes(perfil.role)) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/" element={<Guard><Dashboard /></Guard>} />
          <Route
            path="/diligenciar"
            element={
              <Guard roles={['encuestado', 'orientador', 'administrador', 'coordinador_administrativo']}>
                <DiligenciarEncuesta />
              </Guard>
            }
          />
          <Route
            path="/gestion"
            element={
              <Guard roles={['administrador', 'coordinador_administrativo']}>
                <GestionEncuesta />
              </Guard>
            }
          />
          <Route
            path="/asignaciones"
            element={
              <Guard roles={['administrador', 'coordinador_administrativo']}>
                <Asignaciones />
              </Guard>
            }
          />
          <Route
            path="/estado-encuestas"
            element={
              <Guard roles={['administrador', 'coordinador_administrativo']}>
                <EstadoEncuestas />
              </Guard>
            }
          />
          <Route path="/reportes" element={<Guard><Reportes /></Guard>} />
          <Route
            path="/panel-ejecutivo"
            element={
              <Guard roles={['administrador', 'coordinador_administrativo']}>
                <PanelEjecutivo />
              </Guard>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <Guard roles={['administrador']}>
                <Usuarios />
              </Guard>
            }
          />
          <Route
            path="/admin/areas"
            element={
              <Guard roles={['administrador']}>
                <Areas />
              </Guard>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
