import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Reset() {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMsg('No se pudo actualizar la contraseña')
    else {
      setMsg('Contraseña actualizada, ingresando…')
      setTimeout(() => navigate('/'), 1200)
    }
  }

  return (
    <div className="login-page flex items-center justify-center p-4">
      <form onSubmit={guardar} className="login-card flex w-full max-w-md flex-col gap-3 p-8">
        <h1 className="mb-2 text-center text-lg font-semibold text-white">Nueva contraseña</h1>
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
        <button type="submit" className="login-btn py-2 text-sm font-medium text-white">
          Guardar
        </button>
      </form>
    </div>
  )
}
