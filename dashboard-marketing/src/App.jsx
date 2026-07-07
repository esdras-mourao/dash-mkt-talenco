import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Orcamento from './pages/Orcamento'
import Caixa from './pages/Caixa'
import Campanhas from './pages/Campanhas'
import Audiencia from './pages/Audiencia'
import Eventos from './pages/Eventos'
import Brindes from './pages/Brindes'
import Gastos from './pages/Gastos'
import Configuracoes from './pages/Configuracoes'
import Usuarios from './pages/Usuarios'

function ProtectedRoute({ children, permission }) {
  const { can } = useAuth()
  if (permission && !can(permission)) return <Navigate to="/" />
  return children
}

function AppShell() {
  const { user, loading, theme } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="font-display text-lg animate-pulse" style={{ color: 'var(--accent)' }}>TalenCo</div>
    </div>
  )
  if (!user) return <Login />

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/orcamento" element={<Orcamento />} />
          <Route path="/caixa" element={
            <ProtectedRoute permission="canAddVendas"><Caixa /></ProtectedRoute>
          } />
          <Route path="/campanhas" element={<Campanhas />} />
          <Route path="/audiencia" element={<Audiencia />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/brindes" element={<Brindes />} />
          <Route path="/gastos" element={
            <ProtectedRoute permission="canAddGastos"><Gastos /></ProtectedRoute>
          } />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/usuarios" element={
            <ProtectedRoute permission="canManageUsers"><Usuarios /></ProtectedRoute>
          } />
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
