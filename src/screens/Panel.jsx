import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getConfig } from '../lib/menuDB'
import { C, FONT, DISPLAY } from '../lib/theme'

// Lima es UTC-5, sin horario de verano
function inicioHoyLima() {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  return `${hoy}T05:00:00.000Z`
}

export default function Panel({ onSelectTable, onTakeaway, onWhatsApp, onHistory, onAdmin, onLogout }) {
  const [now, setNow] = useState(new Date())
  const [pedidosHoy, setPedidosHoy] = useState([])
  const [mesasOcupadas, setMesasOcupadas] = useState({})
  const [errorCarga, setErrorCarga] = useState(null)
  const [confirmCobro, setConfirmCobro] = useState(null) // { mesa, pedido }
  const [cobrandoId, setCobrandoId] = useState(null)
  const [errorCobro, setErrorCobro] = useState(null)
  const [pagoModal, setPagoModal] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(null) // { label, pedidoId }
  const [cancelando, setCancelando] = useState(false)
  const [numMesas, setNumMesas] = useState(4)

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
        if (p.tipo === 'mesa' && p.mesa && p.estado === 'confirmado') {
          if (!ocupadas[p.mesa]) ocupadas[p.mesa] = p
        }
      })
      setMesasOcupadas(ocupadas)
    }
  }, [])

  useEffect(() => {
    getConfig('num_mesas').then(v => { if (v) setNumMesas(Number(v)) })
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

  const cancelarPedido = async () => {
    if (!confirmCancel) return
    setCancelando(true)
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', confirmCancel.pedidoId)
    setCancelando(false)
    if (!error) {
      setConfirmCancel(null)
      cargarPedidosHoy()
    }
  }

  const cobrarMesa = async () => {
    if (!confirmCobro || !pagoModal) return
    setErrorCobro(null)
    setCobrandoId(confirmCobro.pedido.id)
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'entregado', metodo_pago: pagoModal })
      .eq('id', confirmCobro.pedido.id)
    setCobrandoId(null)
    if (error) {
      setErrorCobro('No se pudo cobrar. Verifica tu conexión.')
    } else {
      setConfirmCobro(null)
      setPagoModal(null)
      cargarPedidosHoy()
    }
  }

  const pedidosActivos = pedidosHoy.filter(p => p.estado !== 'cancelado')
  const totalHoy = pedidosActivos.reduce((s, p) => s + Number(p.total), 0)
  const countLlevar = pedidosHoy.filter(p => p.tipo === 'llevar' && p.estado === 'confirmado').length
  const countWA = pedidosHoy.filter(p => p.tipo === 'whatsapp' && p.estado === 'confirmado').length
  const pendientesLlevarWA = pedidosHoy
    .filter(p => (p.tipo === 'llevar' || p.tipo === 'whatsapp') && p.estado === 'confirmado')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const segundos = now.getSeconds().toString().padStart(2, '0')
  const fecha = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
  const mesas = Array.from({ length: numMesas }, (_, i) => i + 1)

  return (
    <div style={{
      width: '100%', minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: FONT, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '54px 18px 16px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <img src="/logo.jpg" alt="Grit Burger" style={{ height: 32, borderRadius: 6 }} />
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 32, letterSpacing: -1, lineHeight: 1, marginTop: 2 }}>
              {hora}<span style={{ fontSize: 18, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>:{segundos}</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{fecha}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 2 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Ventas hoy</div>
              <button onClick={cargarPedidosHoy} style={{
                background: 'transparent', border: 'none', color: C.dim,
                cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1,
              }}>↻</button>
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 26, color: C.accent, letterSpacing: -0.5 }}>S/ {totalHoy.toFixed(0)}</div>
            <div style={{ fontSize: 10, color: C.green, fontWeight: 700, marginTop: 2 }}>▲ {pedidosActivos.length} pedidos</div>
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
            {Object.keys(mesasOcupadas).length}/{numMesas} ocupadas
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {mesas.map(n => {
            const ocupada = mesasOcupadas[n]
            const totalItems = ocupada?.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0
            const color = ocupada ? colorPorTiempo(ocupada.created_at) : C.border
            const mins = ocupada ? minutosDesde(ocupada.created_at) : 0
            const urgente = mins >= 25
            const advertencia = mins >= 15 && mins < 25
            return (
              <div key={n} style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectTable(n, ocupada)}
                  onKeyDown={e => e.key === 'Enter' && onSelectTable(n, ocupada)}
                  style={{
                    background: ocupada ? color : C.card,
                    borderTop: `1px solid ${color}`,
                    borderLeft: `1px solid ${color}`,
                    borderRight: `1px solid ${color}`,
                    borderBottom: ocupada ? 'none' : `1px solid ${color}`,
                    borderRadius: ocupada ? '14px 14px 0 0' : 14,
                    padding: '16px 14px',
                    cursor: 'pointer', textAlign: 'left', color: C.text,
                    boxShadow: ocupada ? `0 8px 24px ${color}44` : 'none',
                    transition: 'background .8s, border-color .8s, box-shadow .8s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7 }}>Mesa</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {urgente && <span style={{ fontSize: 11 }}>⚠️</span>}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: ocupada ? '#fff' : C.border,
                        boxShadow: ocupada ? '0 0 0 3px rgba(255,255,255,0.2)' : 'none',
                      }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 36, lineHeight: 1, letterSpacing: -1 }}>{n}</div>
                  {ocupada ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontFamily: DISPLAY, fontSize: 16, letterSpacing: -0.3 }}>S/{Number(ocupada.total).toFixed(0)}</div>
                      <div style={{ fontSize: 10, fontWeight: 800, marginTop: 2, opacity: urgente ? 1 : 0.8 }}>
                        {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'} · {tiempoDesde(ocupada.created_at)}
                        {urgente && ' ·  demorado'}
                        {advertencia && ' · revisar'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginTop: 8 }}>Libre · Tocar para iniciar</div>
                  )}
                </div>

                {ocupada && ocupada.listo && (
                  <div style={{
                    background: '#22c55e', padding: '5px 12px',
                    borderLeft: `1px solid ${color}44`,
                    borderRight: `1px solid ${color}44`,
                    textAlign: 'center',
                    color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: 1,
                  }}>
                    ✓ LISTO — a entregar
                  </div>
                )}
                {ocupada && (
                  <div style={{ display: 'flex', borderTop: 'none' }}>
                    <button
                      onClick={() => { setConfirmCobro({ mesa: n, pedido: ocupada }); setPagoModal(ocupada.metodo_pago || null) }}
                      style={{
                        flex: 1, padding: '7px 12px',
                        background: ocupada.listo ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)',
                        border: `1px solid ${color}44`,
                        borderTop: 'none', borderRight: 'none',
                        borderRadius: '0 0 0 14px',
                        color: C.green, fontFamily: FONT, fontWeight: 800, fontSize: 10,
                        cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
                      }}
                    >
                      ✓ Cobrar
                    </button>
                    <button
                      onClick={() => setConfirmCancel({ label: `Mesa ${n}`, pedidoId: ocupada.id })}
                      style={{
                        padding: '7px 10px',
                        background: 'rgba(239,68,68,0.08)',
                        border: `1px solid ${color}44`,
                        borderTop: 'none', borderLeft: `1px solid ${color}22`,
                        borderRadius: '0 0 14px 0',
                        color: '#ef4444', fontFamily: FONT, fontWeight: 800, fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Cola de llevar/WA en espera */}
        {pendientesLlevarWA.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              En espera
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pendientesLlevarWA.map(p => {
                const color = colorPorTiempo(p.created_at)
                const mins = minutosDesde(p.created_at)
                const urgente = mins >= 25
                const totalItems = p.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0
                return (
                  <div key={p.id} style={{
                    background: C.card,
                    border: `1px solid ${color}33`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: DISPLAY, fontSize: 13, textTransform: 'uppercase', letterSpacing: -0.2 }}>
                        {p.tipo === 'llevar' ? '🛵' : '📱'}{' '}
                        {p.cliente || (p.tipo === 'llevar' ? 'Para llevar' : 'WhatsApp')}
                        {urgente && <span style={{ marginLeft: 6, fontSize: 12 }}>⚠️</span>}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginTop: 2 }}>
                        {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'} · #{p.numero}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div>
                        {p.listo ? (
                          <div style={{
                            background: '#22c55e', color: '#fff',
                            borderRadius: 6, padding: '3px 8px',
                            fontSize: 11, fontWeight: 900,
                            textTransform: 'uppercase', letterSpacing: 0.5,
                            marginBottom: 3,
                          }}>✓ Listo</div>
                        ) : (
                          <div style={{ fontFamily: DISPLAY, fontSize: 16, color, letterSpacing: -0.3 }}>
                            {tiempoDesde(p.created_at)}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>
                          S/{Number(p.total).toFixed(0)}
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmCancel({ label: p.cliente || (p.tipo === 'llevar' ? 'Para llevar' : 'WhatsApp'), pedidoId: p.id })}
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          color: '#ef4444', fontWeight: 900, fontSize: 13,
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Para llevar y WhatsApp */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onTakeaway} style={bigBtn('#1a1a1a', C.border)}>
            <span style={{ fontSize: 20 }}>🛵</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Para llevar</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Cliente recoge en local</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {countLlevar > 0 && (
                <span style={{
                  background: C.accentDim, color: C.accent, borderRadius: 6,
                  padding: '2px 9px', fontFamily: DISPLAY, fontSize: 13,
                }}>{countLlevar}</span>
              )}
              <span style={{ color: C.muted, fontSize: 20 }}>›</span>
            </div>
          </button>

          <button onClick={onWhatsApp} style={bigBtn('#0d1f12', '#22c55e44')}>
            <span style={{ fontSize: 20 }}>📱</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5, color: C.green }}>Pedido WhatsApp</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Delivery por mensaje</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {countWA > 0 && (
                <span style={{
                  background: 'rgba(34,197,94,0.15)', color: C.green, borderRadius: 6,
                  padding: '2px 9px', fontFamily: DISPLAY, fontSize: 13,
                }}>{countWA}</span>
              )}
              <span style={{ color: C.muted, fontSize: 20 }}>›</span>
            </div>
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
        <button onClick={onAdmin} style={{
          background: 'transparent', border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '8px 14px', color: C.muted,
          fontFamily: FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer',
          letterSpacing: 1, textTransform: 'uppercase',
        }}>⚙ Admin</button>
        <button onClick={onLogout} style={{
          background: 'transparent', border: 'none',
          color: C.dim, fontFamily: FONT, fontWeight: 700, fontSize: 11,
          cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
        }}>Salir ›</button>
      </div>

      {/* Modal confirmación cancelar */}
      {confirmCancel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', zIndex: 200, fontFamily: FONT,
        }}>
          <div style={{
            width: '100%', background: C.card,
            borderRadius: '20px 20px 0 0', padding: '24px 20px 44px',
            borderTop: '1px solid rgba(239,68,68,0.3)',
          }}>
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              Cancelar pedido
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 8 }}>
              {confirmCancel.label}
            </div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 24 }}>
              El pedido se marcará como cancelado. Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmCancel(null)}
                disabled={cancelando}
                style={{
                  flex: 1, padding: '14px', borderRadius: 12,
                  border: `1px solid ${C.border}`, background: 'transparent',
                  color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', textTransform: 'uppercase',
                }}
              >
                Volver
              </button>
              <button
                onClick={cancelarPedido}
                disabled={cancelando}
                style={{
                  flex: 2, padding: '14px', borderRadius: 12,
                  border: 0, background: cancelando ? '#333' : '#ef4444',
                  color: cancelando ? '#777' : '#fff',
                  fontFamily: FONT, fontWeight: 800, fontSize: 14,
                  cursor: cancelando ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: 0.3,
                  boxShadow: cancelando ? 'none' : '0 8px 24px rgba(239,68,68,0.35)',
                }}
              >
                {cancelando ? 'Cancelando...' : '✕ Cancelar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 16 }}>
              {confirmCobro.pedido.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0} ítems · S/{Number(confirmCobro.pedido.total).toFixed(2)}
            </div>

            {/* Selector de método de pago */}
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Método de pago
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 20 }}>
              {[
                { id: 'yape', label: 'Yape', color: C.yape },
                { id: 'plin', label: 'Plin', color: C.plin },
                { id: 'tarjeta', label: 'Tarjeta', color: '#2563eb' },
                { id: 'efectivo', label: 'Efectivo', color: '#16a34a' },
              ].map(p => (
                <button key={p.id} onClick={() => setPagoModal(p.id)} style={{
                  padding: '10px 4px', borderRadius: 10,
                  border: `1px solid ${pagoModal === p.id ? p.color : C.border}`,
                  background: pagoModal === p.id ? p.color : C.bg,
                  color: pagoModal === p.id ? '#fff' : C.muted,
                  fontFamily: FONT, fontWeight: 800, fontSize: 11,
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.3,
                  transition: 'all .15s',
                }}>{p.label}</button>
              ))}
            </div>

            {errorCobro && (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: 12, fontWeight: 700,
              }}>{errorCobro}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setConfirmCobro(null); setErrorCobro(null); setPagoModal(null) }}
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
                disabled={!!cobrandoId || !pagoModal}
                style={{
                  flex: 2, padding: '14px', borderRadius: 12,
                  border: 0,
                  background: cobrandoId || !pagoModal ? '#333' : C.green,
                  color: cobrandoId || !pagoModal ? '#777' : '#fff',
                  fontFamily: FONT, fontWeight: 800, fontSize: 14,
                  cursor: cobrandoId || !pagoModal ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: 0.3,
                  boxShadow: cobrandoId || !pagoModal ? 'none' : '0 8px 24px rgba(34,197,94,0.35)',
                  transition: 'all .15s',
                }}
              >
                {cobrandoId ? 'Cerrando...' : !pagoModal ? 'Elige cómo pagó' : '✓ Cobrado — Cerrar mesa'}
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

function minutosDesde(iso) {
  return Math.floor((Date.now() - new Date(iso)) / 60000)
}

function tiempoDesde(iso) {
  const mins = minutosDesde(iso)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}min`
}

function colorPorTiempo(iso) {
  const mins = minutosDesde(iso)
  if (mins >= 25) return '#ef4444' // rojo — demorado
  if (mins >= 15) return '#f59e0b' // ámbar — revisar
  return C.accent                  // naranja — normal
}
