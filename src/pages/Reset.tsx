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
    <div className="flex min-h-screen items-center justify-center bg-[var(--neu-bg)] p-4">
      <form onSubmit={guardar} className="neu-flat flex w-full max-w-md flex-col gap-3 p-6">
        <h1 className="mb-2 text-center text-lg font-semibold text-[var(--azul)]">
          Nueva contraseña
        </h1>
        <input
          type="password"
          required
          minLength={6}
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="neu-input px-3 py-2 text-sm"
        />
        {msg && <p className="text-sm text-[var(--azul)]">{msg}</p>}
        <button type="submit" className="neu-convex py-2 text-sm font-medium text-white">
          Guardar
        </button>
      </form>
    </div>
  )
}
