import { Btn } from './UI'

export function DateFilter({ de, ate, onChange, onExport, title = '' }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{color:'var(--text-faint)'}}>De</label>
        <input type="date" value={de} onChange={e=>onChange('de',e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{color:'var(--text-faint)'}}>Até</label>
        <input type="date" value={ate} onChange={e=>onChange('ate',e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
      </div>
      {(de||ate) && (
        <button onClick={()=>{onChange('de','');onChange('ate','')}}
          className="text-xs hover:opacity-70" style={{color:'var(--text-faint)'}}>
          Limpar filtro ×
        </button>
      )}
      <button
        onClick={()=>{
          const t = document.title
          document.title = title || 'TalenCo Dashboard'
          window.print()
          document.title = t
        }}
        className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
        style={{background:'var(--bg-input)',color:'var(--text-primary)',border:'1px solid var(--border)'}}>
        ⬇ Exportar PDF
      </button>
    </div>
  )
}

export function useDateFilter(items, campo = 'data') {
  return (de, ate) => {
    if (!de && !ate) return items
    return items.filter(item => {
      const d = item[campo]?.slice(0,10)
      if (!d) return true
      if (de && d < de) return false
      if (ate && d > ate) return false
      return true
    })
  }
}
