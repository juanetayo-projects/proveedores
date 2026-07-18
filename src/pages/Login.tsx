import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [modo, setModo] = useState<'login' | 'recuperar'>('login')
  const [cargando, setCargando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setCargando(false)
    if (error) setMsg('Credenciales inválidas')
  }

  async function recuperar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setCargando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}#/reset`,
    })
    setCargando(false)
    setMsg(error ? 'No se pudo enviar el correo' : 'Revisa tu correo para continuar')
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
              type="email"
              required
              placeholder="Correo institucional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input px-3 py-2 text-sm"
            />
            <input
              type="password"
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input px-3 py-2 text-sm"
            />
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
              type="email"
              required
              placeholder="Correo institucional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
