import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './screens/Login'
import Panel from './screens/Panel'
import Pedido from './screens/Pedido'
import Ticket from './screens/Ticket'
import Historial from './screens/Historial'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('panel') // panel | pedido | ticket | historial
  const [pedidoActual, setPedidoActual] = useState(null)
  const [pedidoGuardado, setPedidoGuardado] = useState(null)

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

  // Iniciar pedido desde mesa
  const handleSelectTable = (mesa, pedidoExistente) => {
    setPedidoActual({ tipo: 'mesa', mesa })
    setScreen('pedido')
  }

  // Iniciar pedido para llevar
  const handleTakeaway = () => {
    const cliente = prompt('Nombre del cliente (opcional):') || ''
    setPedidoActual({ tipo: 'llevar', cliente })
    setScreen('pedido')
  }

  // Iniciar pedido WhatsApp
  const handleWhatsApp = () => {
    const cliente = prompt('Nombre del cliente:') || ''
    setPedidoActual({ tipo: 'whatsapp', cliente })
    setScreen('pedido')
  }

  // Confirmar pedido → ir al ticket
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

  if (screen === 'pedido' && pedidoActual) {
    return (
      <Pedido
        tipo={pedidoActual.tipo}
        mesa={pedidoActual.mesa}
        cliente={pedidoActual.cliente}
        onConfirm={handleConfirm}
        onBack={() => setScreen('panel')}
      />
    )
  }

  if (screen === 'ticket' && pedidoGuardado) {
    return (
      <Ticket
        pedido={pedidoGuardado}
        onVolver={() => { setScreen('panel'); setPedidoGuardado(null) }}
        onNuevoPedido={() => { setScreen('panel'); setPedidoGuardado(null) }}
      />
    )
  }

  if (screen === 'historial') {
    return <Historial onBack={() => setScreen('panel')} />
  }

  return (
    <Panel
      onSelectTable={handleSelectTable}
      onTakeaway={handleTakeaway}
      onWhatsApp={handleWhatsApp}
      onHistory={() => setScreen('historial')}
      onLogout={handleLogout}
    />
  )
}