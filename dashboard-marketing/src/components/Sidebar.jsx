import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const nav = [
  { to:'/',             icon:'▦', label:'Visão Geral',           roles:['admin','assistente'] },
  { to:'/balanco',      icon:'⊞', label:'Balanço',               roles:['admin'] },
  { to:'/orcamento',    icon:'◈', label:'Orçamento',             roles:['admin','assistente'] },
  { to:'/caixa',        icon:'◎', label:'Caixa de Marketing',    roles:['admin'] },
  { to:'/campanhas',    icon:'◉', label:'Campanhas',             roles:['admin','assistente'] },
  { to:'/funil',        icon:'⬇', label:'Funil Mkt & Vendas',   roles:['admin','assistente'] },
  { to:'/audiencia',    icon:'◍', label:'Audiência & Branding',  roles:['admin','assistente'] },
  { to:'/eventos',      icon:'◆', label:'Eventos & Ativações',   roles:['admin','assistente'] },
  { to:'/brindes',      icon:'◇', label:'Brindes',               roles:['admin','assistente'] },
  { to:'/gastos',       icon:'◐', label:'Gastos',                roles:['admin'] },
  { to:'/fornecedores', icon:'🏢', label:'Fornecedores',          roles:['admin','assistente'] },
  { to:'/configuracoes',icon:'⚙',  label:'Configurações',         roles:['admin','assistente'] },
]

export default function Sidebar() {
  const { profile, signOut, theme, toggleTheme, role } = useAuth()
  const visible = nav.filter(n=>n.roles.includes(role))

  return (
    <aside className="w-56 shrink-0 border-r flex flex-col min-h-screen sidebar-nav"
      style={{background:'var(--sidebar-bg)',borderColor:'var(--border)'}}>
      <div className="px-4 py-4 border-b" style={{borderColor:'var(--border)'}}>
        <img src="/logo.png" alt="TalenCo" className="h-8 w-auto object-contain"
          style={{filter:theme==='light'?'none':'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(1.1)'}}
          onError={e=>{e.target.style.display='none'; const d=document.getElementById('logo-fallback'); if(d) d.style.display='block'}}/>
        <div id="logo-fallback" style={{display:'none'}}>
          <div className="font-display text-lg font-bold" style={{color:'var(--accent)'}}>TalenCo</div>
        </div>
        <div className="text-[10px] mt-0.5 font-medium" style={{color:'var(--text-faint)'}}>Marketing Dashboard</div>
      </div>
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {visible.map(({to,icon,label})=>(
          <NavLink key={to} to={to} end={to==='/'}
            className={({isActive})=>`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive?'':'hover:opacity-80'}`}
            style={({isActive})=>({background:isActive?'var(--accent)18':'transparent',color:isActive?'var(--accent)':'var(--text-faint)'})}>
            <span className="text-sm">{icon}</span>{label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t" style={{borderColor:'var(--border)'}}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-semibold truncate" style={{color:'var(--text-primary)'}}>{profile?.name||'Usuário'}</div>
            <div className="text-[10px] capitalize" style={{color:'var(--text-faint)'}}>{role}</div>
          </div>
          <button onClick={toggleTheme} title={theme==='dark'?'Tema claro':'Tema escuro'}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all hover:opacity-70"
            style={{background:'var(--bg-input)',color:'var(--text-muted)'}}>
            {theme==='dark'?'☀':'🌙'}
          </button>
        </div>
        <button onClick={signOut} className="text-[10px] hover:text-red-400 transition-colors" style={{color:'var(--text-faint)'}}>Sair →</button>
      </div>
    </aside>
  )
}
