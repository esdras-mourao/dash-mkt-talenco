import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const nav = [
  { to:'/',            icon:'▦', label:'Visão Geral',          roles:['admin','assistente'] },
  { to:'/balanco',     icon:'⊞', label:'Balanço',              roles:['admin'] },
  { to:'/orcamento',   icon:'◈', label:'Orçamento',            roles:['admin','assistente'] },
  { to:'/caixa',       icon:'◎', label:'Caixa de Marketing',   roles:['admin'] },
  { to:'/campanhas',   icon:'◉', label:'Campanhas',            roles:['admin','assistente'] },
  { to:'/audiencia',   icon:'◍', label:'Audiência & Branding', roles:['admin','assistente'] },
  { to:'/eventos',     icon:'◆', label:'Eventos & Ativações',  roles:['admin','assistente'] },
  { to:'/brindes',     icon:'◇', label:'Inventário de Brindes',roles:['admin','assistente'] },
  { to:'/gastos',      icon:'◐', label:'Gastos',               roles:['admin'] },
  { to:'/configuracoes',icon:'⚙',label:'Configurações',        roles:['admin','assistente'] },
]

export default function Sidebar() {
  const { profile, signOut, theme, toggleTheme, role } = useAuth()
  const visible = nav.filter(n=>n.roles.includes(role))

  const linkClass = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
     ${isActive ? 'font-semibold' : 'hover:opacity-80'}`

  const linkStyle = (isActive) => ({
    background: isActive ? 'var(--accent)18' : 'transparent',
    color: isActive ? 'var(--accent)' : 'var(--text-faint)',
  })

  return (
    <aside className="w-56 shrink-0 border-r flex flex-col min-h-screen"
      style={{background:'var(--sidebar-bg)',borderColor:'var(--border)'}}>
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{borderColor:'var(--border)'}}>
        <img src="/logo.png" alt="TalenCo"
          className="h-8 w-auto object-contain"
          style={{filter: theme==='light' ? 'none' : 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(5deg)'}}
          onError={e=>{
            e.target.style.display='none'
            document.getElementById('logo-fallback').style.display='block'
          }}
        />
        <div id="logo-fallback" style={{display:'none'}}>
          <div className="font-display text-lg font-bold" style={{color:'var(--accent)'}}>TalenCo</div>
        </div>
        <div className="text-xs mt-0.5" style={{color:'var(--text-faint)'}}>Marketing Dashboard</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
        {visible.map(({to,icon,label})=>(
          <NavLink key={to} to={to} end={to==='/'} className={({isActive})=>linkClass(isActive)} style={({isActive})=>linkStyle(isActive)}>
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + theme */}
      <div className="px-4 py-4 border-t" style={{borderColor:'var(--border)'}}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-semibold truncate" style={{color:'var(--text-primary)'}}>{profile?.name||'Usuário'}</div>
            <div className="text-[10px] capitalize" style={{color:'var(--text-faint)'}}>{role}</div>
          </div>
          <button onClick={toggleTheme} title={theme==='dark'?'Tema claro':'Tema escuro'}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
            style={{background:'var(--bg-input)',color:'var(--text-muted)'}}>
            {theme==='dark'?'☀':'🌙'}
          </button>
        </div>
        <button onClick={signOut} className="text-xs hover:text-red-400 transition-colors" style={{color:'var(--text-faint)'}}>Sair →</button>
      </div>
    </aside>
  )
}
