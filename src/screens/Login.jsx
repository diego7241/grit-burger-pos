import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, FONT, DISPLAY } from '../lib/theme'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(null)

  const handleLogin = async () => {
    if (!email || !password) { setError('Ingresa tu email y contraseña'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError('Email o contraseña incorrectos')
    else onLogin()
    setLoading(false)
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleLogin() }

  return (
    <div style={{
      width: '100%', minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: FONT, display: 'flex', flexDirection: 'column',
      padding: '70px 28px 40px', boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
        width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,107,0,0.18), transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src="/logo.jpg"
          alt="Grit Burger"
          style={{
            width: '100%', maxWidth: 280,
            borderRadius: 16,
            boxShadow: `0 20px 60px rgba(255,107,0,0.2)`,
            marginBottom: 28,
          }}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: C.muted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700,
        }}>
          <span style={{ width: 18, height: 1, background: C.accent }} />
          Sistema de ventas
          <span style={{ width: 18, height: 1, background: C.accent }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Email" value={email} onChange={setEmail} focused={focus === 'e'}
          onFocus={() => setFocus('e')} onBlur={() => setFocus(null)}
          icon="@" onKeyDown={handleKey} />
        <Field label="Contraseña" value={password} onChange={setPassword} type="password"
          focused={focus === 'p'} onFocus={() => setFocus('p')} onBlur={() => setFocus(null)}
          icon="✱" onKeyDown={handleKey} />

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 14px', color: '#ef4444',
            fontSize: 13, fontWeight: 700, textAlign: 'center',
          }}>{error}</div>
        )}

        <div style={{ height: 4 }} />
        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', border: 0, padding: '16px 20px', borderRadius: 14,
          background: loading ? '#333' : C.accent, color: loading ? '#777' : '#fff',
          fontFamily: FONT, fontWeight: 800, fontSize: 16, letterSpacing: 0.3,
          cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
          boxShadow: loading ? 'none' : `0 8px 24px rgba(255,107,0,0.4)`,
          transition: 'all .15s',
        }}>
          {loading ? 'Entrando...' : 'Entrar →'}
        </button>
      </div>

      <div style={{ textAlign: 'center', color: C.dim, fontSize: 10, marginTop: 28, letterSpacing: 2, fontWeight: 700 }}>
        v1.0 · GRIT BURGER · LIMA, PERÚ
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', focused, onFocus, onBlur, icon, onKeyDown }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${focused ? C.accent : C.border}`,
      borderRadius: 12, padding: '10px 14px',
      transition: 'border-color .15s, box-shadow .15s',
      boxShadow: focused ? `0 0 0 4px ${C.accentDim}` : 'none',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: '#1f1f1f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: focused ? C.accent : C.muted, fontWeight: 800, fontSize: 14,
        flex: '0 0 auto', transition: 'color .15s',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {label}
        </div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          style={{
            width: '100%', background: 'transparent', border: 0, outline: 'none',
            color: C.text, fontFamily: FONT, fontWeight: 700, fontSize: 15, padding: '2px 0',
          }}
        />
      </div>
    </div>
  )
}