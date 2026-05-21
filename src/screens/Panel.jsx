import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, FONT, DISPLAY } from '../lib/theme'

export default function Panel({ onSelectTable, onTakeaway, onWhatsApp, onHistory, onLogout }) {
  const [now, setNow] = useState(new Date())
  const [pedidosHoy, setPedidosHoy] = useState([])
  const [mesasOcupadas, setMesasOcupadas] = useState({})

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    cargarPedidosHoy()
    // Suscripción en tiempo real
    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        cargarPedidosHoy()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const cargarPedidosHoy = async () => {
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .gte('created_at', hoy)
      .order('created_at', { ascending: false })
    if (data) {
      setPedidosHoy(data)
      // calcular mesas ocupadas (últimos pedidos activos por mesa)
      const ocupadas = {}
      data.forEach(p => {
        if (p.tipo === 'mesa' && p.mesa && p.estado !== 'entregado') {
          if (!ocupadas[p.mesa]) ocupadas[p.mesa] = p
        }
      })
      setMesasOcupadas(ocupadas)
    }
  }

  const totalHoy = pedidosHoy.reduce((s, p) => s + Number(p.total), 0)
  const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const segundos = now.getSeconds().toString().padStart(2, '0')
  const fecha = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

  const mesas = [1, 2, 3, 4]

  return (
    <div style={{
      width: '100%', minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: FONT, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '54px 18px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: C.card,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 16, color: C.accent, textTransform: 'uppercase', letterSpacing: 1 }}>Grit Burger</span>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>POS</span>
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 32, letterSpacing: -1, lineHeight: 1, marginTop: 2 }}>
              {hora}<span style={{ fontSize: 18, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>:{segundos}</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{fecha}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Ventas hoy</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 26, color: C.accent, letterSpacing: -0.5 }}>S/ {totalHoy.toFixed(0)}</div>
            <div style={{ fontSize: 10, color: C.green, fontWeight: 700, marginTop: 2 }}>▲ {pedidosHoy.length} pedidos</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 18px 24px', overflowY: 'auto' }}>
        {/* Mesas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Mesas</div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>
            {Object.keys(mesasOcupadas).length}/4 ocupadas
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {mesas.map(n => {
            const ocupada = mesasOcupadas[n]
            return (
              <button key={n} onClick={() => onSelectTable(n, ocupada)}
                style={{
                  background: ocupada ? C.accent : C.card,
                  border: `1px solid ${ocupada ? C.accent : C.border}`,
                  borderRadius: 14, padding: '16px 14px',
                  cursor: 'pointer', textAlign: 'left', color: C.text,
                  boxShadow: ocupada ? `0 8px 24px rgba(255,107,0,0.3)` : 'none',
                  transition: 'all .15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7 }}>Mesa</div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: ocupada ? '#fff' : C.border,
                    boxShadow: ocupada ? '0 0 0 3px rgba(255,255,255,0.2)' : 'none',
                  }} />
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 36, lineHeight: 1, letterSpacing: -1 }}>{n}</div>
                {ocupada ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 16, letterSpacing: -0.3 }}>S/{Number(ocupada.total).toFixed(0)}</div>
                    <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 700, marginTop: 2 }}>
                      {ocupada.items?.length || 0} items · {tiempoDesde(ocupada.created_at)}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginTop: 8 }}>Libre · Tocar para iniciar</div>
                )}
              </button>
            )
          })}
        </div>

        {/* Botones para llevar y WhatsApp */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onTakeaway} style={bigBtn('#1a1a1a', C.border)}>
            <span style={{ fontSize: 20 }}>🛵</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Para llevar</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Cliente recoge en local</div>
            </div>
            <span style={{ color: C.muted, fontSize: 20 }}>›</span>
          </button>

          <button onClick={onWhatsApp} style={bigBtn('#0d1f12', '#22c55e44')}>
            <span style={{ fontSize: 20 }}>📱</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5, color: C.green }}>Pedido WhatsApp</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Delivery por mensaje</div>
            </div>
            <span style={{ color: C.muted, fontSize: 20 }}>›</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 18px', borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: C.card,
      }}>
        <button onClick={onHistory} style={{
          background: 'transparent', border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '8px 14px', color: C.muted,
          fontFamily: FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer',
          letterSpacing: 1, textTransform: 'uppercase',
        }}>📋 Historial</button>
        <button onClick={onLogout} style={{
          background: 'transparent', border: 'none',
          color: C.dim, fontFamily: FONT, fontWeight: 700, fontSize: 11,
          cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
        }}>Salir ›</button>
      </div>
    </div>
  )
}

function bigBtn(bg, borderColor) {
  return {
    width: '100%', background: bg, border: `1px solid ${borderColor}`,
    borderRadius: 14, padding: '14px 16px', cursor: 'pointer', color: '#fff',
    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
    fontFamily: "'Archivo', system-ui, sans-serif",
    transition: 'opacity .15s',
  }
}

function tiempoDesde(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h`
}