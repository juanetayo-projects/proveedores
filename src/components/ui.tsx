import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`neu-flat p-5 ${className}`}>{children}</div>
}

export function MetricCard({
  titulo,
  valor,
  icono,
  sub,
}: {
  titulo: string
  valor: ReactNode
  icono?: ReactNode
  sub?: string
}) {
  return (
    <div className="neu-convex p-5 text-white">
      <div className="flex items-center justify-between">
        <span className="text-sm/5 opacity-80">{titulo}</span>
        {icono}
      </div>
      <div className="mt-2 text-3xl font-bold">{valor}</div>
      {sub && <div className="mt-1 text-xs opacity-75">{sub}</div>}
    </div>
  )
}

export function PageHeader({ titulo, acciones }: { titulo: string; acciones?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-[var(--azul)]">{titulo}</h1>
      <div className="flex gap-2">{acciones}</div>
    </div>
  )
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="neu-flat mb-4 flex flex-wrap items-end gap-3 p-4">{children}</div>
}

export function Modal({
  open,
  onClose,
  titulo,
  children,
}: {
  open: boolean
  onClose: () => void
  titulo?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="neu-flat w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {titulo && (
          <div className="neu-convex rounded-b-none px-5 py-3 font-medium text-white">
            {titulo}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Boton({
  variant = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primario' | 'secundario' }) {
  if (variant === 'secundario') {
    return (
      <button
        {...props}
        className={`neu-btn px-4 py-2 text-sm font-medium text-[var(--azul)] disabled:opacity-50 ${className}`}
      />
    )
  }
  return (
    <button
      {...props}
      className={`neu-convex px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${className}`}
    />
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`neu-input w-full px-3 py-2 text-sm ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`neu-input w-full px-3 py-2 text-sm ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`neu-input w-full px-3 py-2 text-sm ${props.className ?? ''}`} />
}

export function Badge({ children, tono = 'azul' }: { children: ReactNode; tono?: 'azul' | 'verde' | 'ambar' | 'rojo' }) {
  const tonos: Record<string, string> = {
    azul: 'bg-[var(--azul)]/10 text-[var(--azul)]',
    verde: 'bg-emerald-500/10 text-emerald-700',
    ambar: 'bg-amber-500/10 text-amber-700',
    rojo: 'bg-rose-500/10 text-rose-700',
  }
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tonos[tono]}`}>{children}</span>
}
