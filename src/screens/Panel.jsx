import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C, FONT, DISPLAY } from '../lib/theme'

// Lima es UTC-5, sin horario de verano
function inicioHoyLima() {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  return `${hoy}T05:00:00.000Z`
}

export default function Panel({ onSelectTable, onTakeaway, onWhatsApp, onHistory, onLogout }) {
  const [now, setNow] = useState(new Date())
  const [pedidosHoy, setPedidosHoy] = useState([])
  const [mesasOcupadas, setMesasOcupadas] = useState({})
  const [errorCarga, setErrorCarga] = useState(null)
  const [confirmCobro, setConfirmCobro] = useState(null) // { mesa, pedido }
  const [cobrandoId, setCobrandoId] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const cargarPedidosHoy = useCallback(async () => {
    setErrorCarga(null)
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .gte('created_at', inicioHoyLima())
      .order('created_at', { ascending: false })

    if (error) {
      setErrorCarga('Sin conexión · datos desactualizados')
      return
    }
    if (data) {
      setPedidosHoy(data)
      const ocupadas = {}
      data.forEach(p => {
        if (p.tipo === 'mesa' && p.mesa && p.estado !== 'entregado') {
          if (!ocupadas[p.mesa]) ocupadas[p.mesa] = p
        }
      })
      setMesasOcupadas(ocupadas)
    }
  }, [])

  useEffect(() => {
    cargarPedidosHoy()
    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        cargarPedidosHoy()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [cargarPedidosHoy])

  const cobrarMesa = async () => {
    if (!confirmCobro) return
    setCobrandoId(confirmCobro.pedido.id)
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'entregado' })
      .eq('id', confirmCobro.pedido.id)
    setCobrandoId(null)
    setConfirmCobro(null)
    if (!error) cargarPedidosHoy()
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
      <div style={{ padding: '54px 18px 16px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
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

      {/* Error banner */}
      {errorCarga && (
        <div style={{
          padding: '8px 18px', background: 'rgba(239,68,68,0.1)',
          borderBottom: `1px solid rgba(239,68,68,0.2)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>{errorCarga}</span>
          <button onClick={cargarPedidosHoy} style={{
            background: 'transparent', border: 'none', color: '#ef4444',
            fontSize: 14, cursor: 'pointer', fontWeight: 700,
          }}>↻ Reintentar</button>
        </div>
      )}

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
            const totalItems = ocupada?.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0
            return (
              <div key={n} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Tarjeta de mesa */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectTable(n, ocupada)}
                  onKeyDown={e => e.key === 'Enter' && onSelectTable(n, ocupada)}
                  style={{
                    background: ocupada ? C.accent : C.card,
                    borderTop: `1px solid ${ocupada ? C.accent : C.border}`,
                    borderLeft: `1px solid ${ocupada ? C.accent : C.border}`,
                    borderRight: `1px solid ${ocupada ? C.accent : C.border}`,
                    borderBottom: ocupada ? 'none' : `1px solid ${C.border}`,
                    borderRadius: ocupada ? '14px 14px 0 0' : 14,
                    padding: '16px 14px',
                    cursor: 'pointer', textAlign: 'left', color: C.text,
                    boxShadow: ocupada ? `0 8px 24px rgba(255,107,0,0.3)` : 'none',
                    transition: 'all .15s',
                  }}
                >
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
                        {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'} · {tiempoDesde(ocupada.created_at)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginTop: 8 }}>Libre · Tocar para iniciar</div>
                  )}
                </div>

                {/* Botón cobrar (solo mesas ocupadas) */}
                {ocupada && (
                  <button
                    onClick={() => setConfirmCobro({ mesa: n, pedido: ocupada })}
                    style={{
                      width: '100%', padding: '7px 12px',
                      background: 'rgba(34,197,94,0.1)',
                      border: `1px solid ${C.accent}44`,
                      borderTop: 'none',
                      borderRadius: '0 0 14px 14px',
                      color: C.green, fontFamily: FONT, fontWeight: 800, fontSize: 10,
                      cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
                      transition: 'background .15s',
                    }}
                  >
                    ✓ Cobrar
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Para llevar y WhatsApp */}
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

      {/* Modal confirmación cobro */}
      {confirmCobro && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', zIndex: 200, fontFamily: FONT,
        }}>
          <div style={{
            width: '100%', background: C.card,
            borderRadius: '20px 20px 0 0', padding: '24px 20px 44px',
            borderTop: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              Mesa {confirmCobro.mesa}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 4 }}>
              Cerrar mesa
            </div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 6 }}>
              {confirmCobro.pedido.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0} ítems ·{' '}
              {confirmCobro.pedido.metodo_pago?.toUpperCase()}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 36, color: C.accent, letterSpacing: -1, marginBottom: 24 }}>
              S/{Number(confirmCobro.pedido.total).toFixed(2)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmCobro(null)}
                disabled={!!cobrandoId}
                style={{
                  flex: 1, padding: '14px', borderRadius: 12,
                  border: `1px solid ${C.border}`, background: 'transparent',
                  color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', textTransform: 'uppercase',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={cobrarMesa}
                disabled={!!cobrandoId}
                style={{
                  flex: 2, padding: '14px', borderRadius: 12,
                  border: 0, background: cobrandoId ? '#333' : C.green, color: cobrandoId ? '#777' : '#fff',
                  fontFamily: FONT, fontWeight: 800, fontSize: 14,
                  cursor: cobrandoId ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: 0.3,
                  boxShadow: cobrandoId ? 'none' : '0 8px 24px rgba(34,197,94,0.35)',
                }}
              >
                {cobrandoId ? 'Cerrando...' : '✓ Cobrado — Cerrar mesa'}
              </button>
            </div>
          </div>
        </div>
      )}
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
