import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) setError('E-mail ou senha incorretos.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="TalenCo" className="h-10 w-auto mx-auto object-contain mb-2"
            onError={e => { e.target.style.display='none' }} />
          <div className="font-display text-3xl font-bold" style={{ color: 'var(--accent)' }}>TalenCo</div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-faint)' }}>Marketing Dashboard</div>
        </div>
        <div className="border rounded-2xl p-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h1 className="font-display text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Entrar</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com"
                className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-input)', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-input)', color: 'var(--text-primary)' }} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-2 font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 bg-talenco-yellow text-talenco-night hover:bg-yellow-300">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-xfaint)' }}>TalenCo Incorporadora · Uso interno</p>
      </div>
    </div>
  )
}
