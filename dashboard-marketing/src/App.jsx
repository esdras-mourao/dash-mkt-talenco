import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Balanco from './pages/Balanco'
import Orcamento from './pages/Orcamento'
import Caixa from './pages/Caixa'
import Campanhas from './pages/Campanhas'
import Audiencia from './pages/Audiencia'
import Funil from './pages/Funil'
import Eventos from './pages/Eventos'
import Brindes from './pages/Brindes'
import Gastos from './pages/Gastos'
import Fornecedores from './pages/Fornecedores'
import Configuracoes from './pages/Configuracoes'

function Protected({ children, permission }) {
  const { can } = useAuth()
  if (permission && !can(permission)) return <Navigate to="/" />
  return children
}

function AppShell() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--bg-base)'}}>
      <div className="font-display text-xl font-bold animate-pulse" style={{color:'var(--accent)'}}>TalenCo</div>
    </div>
  )
  if (!user) return <Login />
  return (
    <div className="flex min-h-screen" style={{background:'var(--bg-base)'}}>
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/balanco" element={<Protected permission="canAddVendas"><Balanco /></Protected>} />
          <Route path="/orcamento" element={<Orcamento />} />
          <Route path="/caixa" element={<Protected permission="canAddVendas"><Caixa /></Protected>} />
          <Route path="/campanhas" element={<Campanhas />} />
          <Route path="/audiencia" element={<Audiencia />} />
          <Route path="/funil" element={<Funil />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/brindes" element={<Brindes />} />
          <Route path="/gastos" element={<Protected permission="canAddGastos"><Gastos /></Protected>} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
