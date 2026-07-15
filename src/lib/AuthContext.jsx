import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

// Permissões por role
export const PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageEmpreendimentos: true,
    canAddVendas: true,
    canAddGastos: true,
    canAddOrcamento: true,
    canAddCampanhas: true,
    canAddEventos: true,
    canAddBrindes: true,
    canAddAudiencia: true,
  },
  assistente: {
    canManageUsers: false,
    canManageEmpreendimentos: false,
    canAddVendas: false,
    canAddGastos: false,
    canAddOrcamento: false,
    canAddCampanhas: true,
    canAddEventos: true,
    canAddBrindes: true,
    canAddAudiencia: false,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setThemeState] = useState(() => localStorage.getItem('talenco-theme') || 'dark')

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('talenco-theme', theme)
  }, [theme])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()
  const toggleTheme = () => setThemeState(t => t === 'dark' ? 'light' : 'dark')

  const role = profile?.role || 'assistente'
  const can = (permission) => PERMISSIONS[role]?.[permission] ?? false

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, theme, toggleTheme, can, role }}>
      {children}
    </AuthContext.Provider>
  )
}
