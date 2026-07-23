import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { colorDeValor } from '../lib/constantes'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="neu-flat w-full max-w-lg">
        <div className="neu-convex flex items-center justify-between gap-3 rounded-b-none px-5 py-3 font-medium text-white">
          <span>{titulo}</span>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white">
            ✕
          </button>
        </div>
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

export type DetalleQA = { pregunta: string; valor: string; tipoRespuesta?: string }
export type PopoverQA = { x: number; y: number; titulo: string; filas: DetalleQA[]; cargando: boolean } | null

export function PopoverRespuestas({ popover, onClose }: { popover: PopoverQA; onClose: () => void }) {
  if (!popover) return null
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="neu-flat fixed z-50 w-80 overflow-hidden p-0"
        style={{ left: popover.x, top: popover.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 bg-[var(--azul)] px-3 py-2">
          <span className="text-xs font-bold text-white">{popover.titulo}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            ✕
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto p-3">
          {popover.cargando && <p className="py-2 text-center text-xs text-slate-400">Cargando…</p>}
          {!popover.cargando &&
            popover.filas.map((d, i) => {
              const color = colorDeValor(d.tipoRespuesta, d.valor)
              return (
                <div key={i} className="neu-pressed mb-2 p-2 text-[11px] last:mb-0">
                  <div className="mb-1 flex items-start gap-2 font-medium text-slate-600">
                    <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--azul)] text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                    {color ? (
                      <span
                        className="mt-px inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                        style={{ background: color }}
                      >
                        {d.valor}
                      </span>
                    ) : (
                      <span className="mt-px shrink-0 font-medium text-slate-800">{d.valor}</span>
                    )}
                  </div>
                  <div className="ml-6 text-slate-700">{d.pregunta}</div>
                </div>
              )
            })}
          {!popover.cargando && popover.filas.length === 0 && (
            <p className="py-2 text-center text-xs text-slate-400">Sin respuestas registradas.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function calcularPosicionPopover(e: { clientX: number; clientY: number }) {
  return {
    x: Math.max(8, Math.min(e.clientX, window.innerWidth - 340)),
    y: Math.max(8, Math.min(e.clientY, window.innerHeight - 320)),
  }
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
