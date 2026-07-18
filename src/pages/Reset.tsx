import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Reset() {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(true)
  const [listo, setListo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    establecerSesionDesdeEnlace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function establecerSesionDesdeEnlace() {
    // Con HashRouter, Supabase agrega los parámetros dentro del propio
    // fragmento (#/reset?token_hash=...) -- se leen directo de location.hash,
    // no de location.search ni de useSearchParams (que no los captura aquí).
    const hash = window.location.hash
    const queryIndex = hash.indexOf('?')
    const queryEnHash = new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : '')
    const queryFuera = new URLSearchParams(window.location.search)

    const tokenHash = queryEnHash.get('token_hash') ?? queryFuera.get('token_hash')
    const tipo = (queryEnHash.get('type') ?? queryFuera.get('type')) as 'recovery' | null
    const code = queryEnHash.get('code') ?? queryFuera.get('code')

    if (tokenHash && tipo) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      setVerificando(false)
      if (error) setMsg('El enlace expiró o ya fue usado. Solicita uno nuevo desde el login.')
      else setListo(true)
      return
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      setVerificando(false)
      if (error) setMsg('El enlace expiró o ya fue usado. Solicita uno nuevo desde el login.')
      else setListo(true)
      return
    }

    // Enlaces antiguos (flujo implícito): tokens en el fragmento #access_token=...
    if (hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(hash.slice(hash.indexOf('access_token=')))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        setVerificando(false)
        if (error) setMsg('El enlace expiró o ya fue usado. Solicita uno nuevo desde el login.')
        else setListo(true)
        return
      }
    }

    // Recarga de la página con una sesión de recuperación ya activa.
    const { data } = await supabase.auth.getSession()
    setVerificando(false)
    if (data.session) setListo(true)
    else setMsg('Abre este formulario directamente desde el enlace del correo de recuperación.')
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setGuardando(false)
    if (error) setMsg(`No se pudo actualizar la contraseña: ${error.message}`)
    else {
      setMsg('Contraseña actualizada, ingresando…')
      setTimeout(() => navigate('/'), 1200)
    }
  }

  return (
    <div className="login-page flex items-center justify-center p-4">
      <div className="login-card flex w-full max-w-md flex-col gap-3 p-8">
        <h1 className="mb-2 text-center text-lg font-semibold text-white">Nueva contraseña</h1>

        {verificando && <p className="text-center text-sm text-blue-100">Verificando enlace…</p>}

        {!verificando && listo && (
          <form onSubmit={guardar} className="flex flex-col gap-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input px-3 py-2 text-sm"
            />
            {msg && <p className="text-sm text-blue-100">{msg}</p>}
            <button type="submit" disabled={guardando} className="login-btn py-2 text-sm font-medium text-white disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        )}

        {!verificando && !listo && (
          <>
            {msg && <p className="text-center text-sm text-rose-300">{msg}</p>}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="login-btn py-2 text-sm font-medium text-white"
            >
              Volver al login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
