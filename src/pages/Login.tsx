import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [modo, setModo] = useState<'login' | 'recuperar'>('login')
  const [cargando, setCargando] = useState(false)
  const [verPassword, setVerPassword] = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function resolverEmail(nombreUsuario: string) {
    const { data, error } = await supabase.rpc('email_por_usuario', { p_username: nombreUsuario.trim() })
    if (error || !data) return null
    return data as string
  }

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setCargando(true)
    const email = await resolverEmail(usuario)
    if (!email) {
      setCargando(false)
      setMsg('Credenciales inválidas')
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setCargando(false)
    if (error) setMsg('Credenciales inválidas')
  }

  async function recuperar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setCargando(true)
    const email = await resolverEmail(usuario)
    if (!email) {
      setCargando(false)
      setMsg('Usuario no encontrado')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}#/reset`,
    })
    setCargando(false)
    setMsg(error ? 'No se pudo enviar el correo. Intenta de nuevo en unos minutos.' : 'Revisa tu correo para continuar')
  }

  return (
    <div className="login-page flex flex-col items-center justify-center p-4">
      <div className="login-card flex w-full max-w-md flex-col items-center gap-3 p-8">
        <img
          src={`${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`}
          alt="CAC Santa Bárbara"
          className="h-14"
        />
        <h1 className="text-center text-lg font-semibold text-white">Encuestas Proveedores</h1>

        {modo === 'login' ? (
          <form onSubmit={entrar} className="mt-2 flex w-full flex-col gap-3">
            <input
              type="text"
              required
              placeholder="Usuario"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="login-input px-3 py-2 text-sm"
            />
            <div className="relative">
              <input
                type={verPassword ? 'text' : 'password'}
                required
                placeholder="Contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input w-full px-3 py-2 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-blue-200 hover:text-white"
              >
                {verPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            {msg && <p className="text-sm text-rose-300">{msg}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="login-btn mt-1 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('recuperar')
                setMsg(null)
              }}
              className="text-center text-xs text-blue-200 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form onSubmit={recuperar} className="mt-2 flex w-full flex-col gap-3">
            <input
              type="text"
              required
              placeholder="Usuario"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="login-input px-3 py-2 text-sm"
            />
            {msg && <p className="text-sm text-blue-100">{msg}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="login-btn mt-1 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {cargando ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('login')
                setMsg(null)
              }}
              className="text-center text-xs text-blue-200 hover:underline"
            >
              Volver a iniciar sesión
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
