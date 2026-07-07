import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const nav = [
  { to: '/',             icon: '▦', label: 'Visão Geral',          roles: ['admin','assistente'] },
  { to: '/orcamento',    icon: '◈', label: 'Orçamento',            roles: ['admin','assistente'] },
  { to: '/caixa',        icon: '◎', label: 'Caixa de Marketing',   roles: ['admin'] },
  { to: '/campanhas',    icon: '◉', label: 'Campanhas',            roles: ['admin','assistente'] },
  { to: '/audiencia',    icon: '◍', label: 'Audiência & Branding', roles: ['admin','assistente'] },
  { to: '/eventos',      icon: '◆', label: 'Eventos & Ativações',  roles: ['admin','assistente'] },
  { to: '/brindes',      icon: '◇', label: 'Inventário de Brindes',roles: ['admin','assistente'] },
  { to: '/gastos',       icon: '◐', label: 'Gastos',               roles: ['admin'] },
]

const navBottom = [
  { to: '/configuracoes', icon: '⚙', label: 'Configurações', roles: ['admin','assistente'] },
  { to: '/usuarios',      icon: '👤', label: 'Usuários',      roles: ['admin'] },
]

export default function Sidebar() {
  const { profile, signOut, theme, toggleTheme, role } = useAuth()

  const linkClass = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
     ${isActive
       ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
       : 'text-[var(--text-faint)] hover:bg-black/5 hover:text-[var(--text-primary)]'}`

  const visibleNav = nav.filter(n => n.roles.includes(role))
  const visibleBottom = navBottom.filter(n => n.roles.includes(role))

  return (
    <aside className="w-56 shrink-0 border-r flex flex-col min-h-screen"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>

      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <img
          src="/logo.png"
          alt="TalenCo"
          className="h-8 w-auto object-contain"
          onError={e => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'block'
          }}
        />
        <div style={{ display: 'none' }}>
          <div className="font-display text-lg font-bold" style={{ color: 'var(--accent)' }}>TalenCo</div>
          <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Marketing Dashboard</div>
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Marketing Dashboard</div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
        {visibleNav.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => linkClass(isActive)}>
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Nav bottom */}
      <div className="px-3 pb-2 flex flex-col gap-0.5 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        {visibleBottom.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>

      {/* User + theme toggle */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {profile?.name || 'Usuário'}
            </div>
            <div className="text-[10px] capitalize" style={{ color: 'var(--text-faint)' }}>{role}</div>
          </div>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
        </div>
        <button
          onClick={signOut}
          className="text-xs hover:text-red-400 transition-colors"
          style={{ color: 'var(--text-faint)' }}
        >
          Sair →
        </button>
      </div>
    </aside>
  )
}
