export function Card({ children, className = '' }) {
  return (
    <div className={`border rounded-xl p-5 ${className}`}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className="border rounded-xl p-5 flex flex-col gap-1"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>{label}</span>
        {icon && <span style={{ color: 'var(--text-faint)' }}>{icon}</span>}
      </div>
      <div className="font-display text-2xl font-bold" style={{ color: accent || 'var(--accent)' }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{sub}</div>}
    </div>
  )
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {sub && <p className="text-sm mt-0.5" style={{ color: 'var(--text-faint)' }}>{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export function Badge({ children, color = 'yellow' }) {
  const map = {
    yellow: { background: '#F2B82A22', color: '#F2B82A' },
    red:    { background: '#ef444422', color: '#f87171' },
    green:  { background: '#22c55e22', color: '#4ade80' },
    blue:   { background: '#1A406033', color: '#60a5fa' },
    gray:   { background: 'var(--bg-input)', color: 'var(--text-muted)' },
  }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={map[color]}>
      {children}
    </span>
  )
}

export function Btn({ children, onClick, variant = 'primary', className = '', type = 'button', disabled }) {
  const base = 'px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50'
  const v = {
    primary: 'bg-talenco-yellow text-talenco-night hover:bg-yellow-300',
    ghost:   'hover:opacity-80',
    danger:  'text-red-400 hover:opacity-80',
  }
  const ghostStyle = variant === 'ghost' ? { background: 'var(--bg-input)', color: 'var(--text-primary)' } : {}
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${v[variant]} ${className}`} style={ghostStyle}>
      {children}
    </button>
  )
}

export function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</label>}
      <input
        {...props}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-input)',
          color: 'var(--text-primary)',
        }}
      />
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</label>}
      <select
        {...props}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-input)',
          color: 'var(--text-primary)',
        }}
      >
        {children}
      </select>
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="border rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="text-xl leading-none hover:opacity-70" style={{ color: 'var(--text-faint)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</div>
      {sub && <div className="text-sm mt-1" style={{ color: 'var(--text-faint)' }}>{sub}</div>}
    </div>
  )
}

// ── DATE FILTER + EXPORT ────────────────────────────────────
export function DateFilter({ from, to, onFrom, onTo, onClear }) {
  return (
    <div className="flex items-center gap-2 flex-wrap no-print">
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{color:'var(--text-faint)'}}>De</label>
        <input type="date" value={from} onChange={e=>onFrom(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
          style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{color:'var(--text-faint)'}}>Até</label>
        <input type="date" value={to} onChange={e=>onTo(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
          style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
      </div>
      {(from||to) && (
        <button onClick={onClear} className="text-xs mt-3 hover:opacity-70" style={{color:'var(--text-faint)'}}>✕ Limpar</button>
      )}
    </div>
  )
}

export function ExportBtn({ label = 'Exportar PDF' }) {
  return (
    <button onClick={()=>window.print()}
      className="no-print flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:opacity-80"
      style={{background:'var(--bg-input)',borderColor:'var(--border)',color:'var(--text-muted)'}}>
      ⬇ {label}
    </button>
  )
}
