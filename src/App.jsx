import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './screens/Login'
import Panel from './screens/Panel'
import Pedido from './screens/Pedido'
import Ticket from './screens/Ticket'
import Historial from './screens/Historial'
import { C, FONT, DISPLAY } from './lib/theme'

function ModalNombre({ titulo, subtitulo, onConfirm, onCancel }) {
  const [nombre, setNombre] = useState('')

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end', zIndex: 100, fontFamily: FONT,
    }}>
      <div style={{
        width: '100%', background: C.card,
        borderRadius: '20px 20px 0 0', padding: '24px 20px 44px',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
          {subtitulo}
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 20 }}>
          {titulo}
        </div>
        <input
          autoFocus
          placeholder="Nombre del cliente (opcional)"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm(nombre.trim())}
          style={{
            width: '100%', background: C.bg,
            border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '14px 16px', color: C.text, fontFamily: FONT,
            fontWeight: 700, fontSize: 15, outline: 'none',
            boxSizing: 'border-box', marginBottom: 14,
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '14px', borderRadius: 12,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', textTransform: 'uppercase',
          }}>Cancelar</button>
          <button onClick={() => onConfirm(nombre.trim())} style={{
            flex: 2, padding: '14px', borderRadius: 12,
            border: 0, background: C.accent, color: '#fff',
            fontFamily: FONT, fontWeight: 800, fontSize: 14,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.3,
            boxShadow: `0 8px 24px rgba(255,107,0,0.35)`,
          }}>Continuar →</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('panel')
  const [pedidoActual, setPedidoActual] = useState(null)
  const [pedidoGuardado, setPedidoGuardado] = useState(null)
  const [modal, setModal] = useState(null) // { tipo: 'llevar' | 'whatsapp' }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setScreen('panel')
  }

  const handleSelectTable = (mesa, pedidoExistente) => {
    setPedidoActual({ tipo: 'mesa', mesa, pedidoExistente: pedidoExistente || null })
    setScreen('pedido')
  }

  const handleTakeaway = () => setModal({ tipo: 'llevar' })
  const handleWhatsApp = () => setModal({ tipo: 'whatsapp' })

  const handleModalConfirm = (cliente) => {
    const tipo = modal.tipo
    setModal(null)
    setPedidoActual({ tipo, cliente })
    setScreen('pedido')
  }

  const handleConfirm = (pedido) => {
    setPedidoGuardado(pedido)
    setScreen('ticket')
  }

  if (loading) return (
    <div style={{
      width: '100vw', height: '100vh', background: '#1a1a1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ color: '#FF6B00', fontFamily: 'Archivo Black, sans-serif', fontSize: 24, textTransform: 'uppercase', letterSpacing: -0.5 }}>
        Grit Burger
      </div>
    </div>
  )

  if (!session) return <Login onLogin={() => setScreen('panel')} />

  let contenido
  if (screen === 'pedido' && pedidoActual) {
    contenido = (
      <Pedido
        tipo={pedidoActual.tipo}
        mesa={pedidoActual.mesa}
        cliente={pedidoActual.cliente}
        pedidoExistente={pedidoActual.pedidoExistente}
        onConfirm={handleConfirm}
        onBack={() => setScreen('panel')}
      />
    )
  } else if (screen === 'ticket' && pedidoGuardado) {
    contenido = (
      <Ticket
        pedido={pedidoGuardado}
        onVolver={() => { setScreen('panel'); setPedidoGuardado(null) }}
      />
    )
  } else if (screen === 'historial') {
    contenido = <Historial onBack={() => setScreen('panel')} />
  } else {
    contenido = (
      <Panel
        onSelectTable={handleSelectTable}
        onTakeaway={handleTakeaway}
        onWhatsApp={handleWhatsApp}
        onHistory={() => setScreen('historial')}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <>
      {contenido}
      {modal && (
        <ModalNombre
          titulo={modal.tipo === 'llevar' ? 'Para llevar' : 'Pedido WhatsApp'}
          subtitulo={modal.tipo === 'llevar' ? 'Cliente recoge en local' : 'Delivery por mensaje'}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  )
}
