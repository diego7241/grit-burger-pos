import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, FONT, DISPLAY } from '../lib/theme'

const PAGO_COLORS = { yape: C.yape, plin: C.plin, tarjeta: '#2563eb', efectivo: '#16a34a' }
const PAGO_LABELS = { yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta', efectivo: 'Efectivo' }
const FILTROS = ['todos', 'mesa', 'llevar', 'whatsapp']

function inicioHoyLima() {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  return `${hoy}T05:00:00.000Z`
}

export default function Historial({ onBack }) {
  const [pedidos, setPedidos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmCancelar, setConfirmCancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [confirmCobrar, setConfirmCobrar] = useState(null)
  const [cobrando, setCobrando] = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('pedidos')
      .select('*')
      .gte('created_at', inicioHoyLima())
      .order('created_at', { ascending: false })
    if (err) setError('No se pudo cargar el historial. Verifica tu conexión.')
    else if (data) setPedidos(data)
    setLoading(false)
  }

  const cobrarPedido = async () => {
    if (!confirmCobrar) return
    setCobrando(true)
    const { error: err } = await supabase
      .from('pedidos')
      .update({ estado: 'entregado' })
      .eq('id', confirmCobrar.id)
    setCobrando(false)
    setConfirmCobrar(null)
    if (!err) cargar()
  }

  const cancelarPedido = async () => {
    if (!confirmCancelar) return
    setCancelando(true)
    const { error: err } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', confirmCancelar.id)
    setCancelando(false)
    setConfirmCancelar(null)
    if (!err) cargar()
  }

  const pedidosActivos = pedidos.filter(p => p.estado !== 'cancelado')
  const filtrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.tipo === filtro)
  const totalHoy = pedidosActivos.reduce((s, p) => s + Number(p.total), 0)

  // Cierre de caja por método de pago
  const cierreCaja = ['efectivo', 'yape', 'plin', 'tarjeta'].map(m => ({
    metodo: m,
    monto: pedidosActivos.filter(p => p.metodo_pago === m).reduce((s, p) => s + Number(p.total), 0),
    count: pedidosActivos.filter(p => p.metodo_pago === m).length,
  })).filter(x => x.monto > 0)

  const tipoLabel = (p) => {
    if (p.tipo === 'mesa') return `Mesa ${p.mesa}`
    if (p.tipo === 'llevar') return p.cliente ? `Llevar · ${p.cliente}` : 'Para llevar'
    return p.cliente ? `WhatsApp · ${p.cliente}` : 'WhatsApp'
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: C.bg, color: C.text, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '54px 18px 14px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: 10, background: C.bg,
            border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: 20,
          }}>‹</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3 }}>Historial del día</div>
          </div>
          <button onClick={cargar} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>↻</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Pedidos', value: pedidosActivos.length },
            { label: 'Total', value: `S/${totalHoy.toFixed(0)}` },
            { label: 'Promedio', value: pedidosActivos.length ? `S/${(totalHoy / pedidosActivos.length).toFixed(0)}` : 'S/0' },
          ].map(s => (
            <div key={s.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.accent }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Cierre de caja */}
        {cierreCaja.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Cierre de caja
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cierreCaja.length, 2)}, 1fr)`, gap: 6 }}>
              {cierreCaja.map(({ metodo, monto, count }) => (
                <div key={metodo} style={{
                  background: C.bg,
                  border: `1px solid ${PAGO_COLORS[metodo]}33`,
                  borderRadius: 10, padding: '8px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: PAGO_COLORS[metodo], fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {PAGO_LABELS[metodo]}
                    </div>
                    <div style={{ fontSize: 10, color: C.dim, fontWeight: 600, marginTop: 1 }}>
                      {count} {count === 1 ? 'pedido' : 'pedidos'}
                    </div>
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 16, color: C.text }}>
                    S/{monto.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTROS.map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: '5px 12px', borderRadius: 8,
              background: filtro === f ? C.accent : C.bg,
              color: filtro === f ? '#fff' : C.muted,
              fontFamily: FONT, fontWeight: 800, fontSize: 10,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
              border: `1px solid ${filtro === f ? C.accent : C.border}`,
            }}>
              {f === 'todos' ? 'Todos' : f === 'mesa' ? '🍽 Mesa' : f === 'llevar' ? '🛵 Llevar' : '📱 WA'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted, fontWeight: 700 }}>Cargando...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, opacity: 0.5, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>{error}</div>
            <button onClick={cargar} style={{
              background: C.accent, color: '#fff', border: 0, borderRadius: 10,
              padding: '10px 20px', fontFamily: FONT, fontWeight: 800, cursor: 'pointer',
              textTransform: 'uppercase', fontSize: 12,
            }}>↻ Reintentar</button>
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
            <div style={{ fontSize: 36, opacity: 0.4 }}>📋</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 16, marginTop: 12, textTransform: 'uppercase' }}>Sin pedidos</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtrados.map(p => {
              const cancelado = p.estado === 'cancelado'
              return (
                <div key={p.id} style={{
                  background: cancelado ? 'rgba(239,68,68,0.04)' : C.card,
                  border: `1px solid ${cancelado ? 'rgba(239,68,68,0.2)' : C.border}`,
                  borderRadius: 12, padding: '12px 14px',
                  opacity: cancelado ? 0.55 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: DISPLAY, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.2 }}>
                        {tipoLabel(p)} <span style={{ color: C.dim, fontSize: 11 }}>#{p.numero}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, marginTop: 2 }}>
                        {new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        {p.estado === 'entregado' && <span style={{ marginLeft: 6, color: C.green }}>· cobrado</span>}
                        {cancelado && <span style={{ marginLeft: 6, color: '#ef4444' }}>· cancelado</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: DISPLAY, fontSize: 16,
                          color: cancelado ? C.dim : C.accent,
                          textDecoration: cancelado ? 'line-through' : 'none',
                        }}>
                          S/{Number(p.total).toFixed(2)}
                        </div>
                        {!cancelado && (
                          <span style={{
                            background: (PAGO_COLORS[p.metodo_pago] || C.muted) + '22',
                            color: PAGO_COLORS[p.metodo_pago] || C.muted,
                            border: `1px solid ${(PAGO_COLORS[p.metodo_pago] || C.muted)}44`,
                            borderRadius: 4, padding: '2px 6px',
                            fontSize: 9, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase',
                          }}>{p.metodo_pago}</span>
                        )}
                      </div>
                      {!cancelado && p.estado !== 'entregado' && (p.tipo === 'llevar' || p.tipo === 'whatsapp') && (
                        <button
                          onClick={() => setConfirmCobrar(p)}
                          style={{
                            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.25)',
                            color: C.green, fontSize: 14, fontWeight: 800,
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >✓</button>
                      )}
                      {!cancelado && (
                        <button
                          onClick={() => setConfirmCancelar(p)}
                          style={{
                            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#ef4444', fontSize: 14, fontWeight: 800,
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >✕</button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                    {Array.isArray(p.items) ? p.items.map(i => `${i.qty}× ${i.name}`).join(', ') : ''}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal cobrar llevar/WA */}
      {confirmCobrar && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', zIndex: 200, fontFamily: FONT,
        }}>
          <div style={{
            width: '100%', background: C.card,
            borderRadius: '20px 20px 0 0', padding: '24px 20px 44px',
            borderTop: '1px solid rgba(34,197,94,0.3)',
          }}>
            <div style={{ fontSize: 10, color: C.green, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              {tipoLabel(confirmCobrar)} · #{confirmCobrar.numero}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 4 }}>
              ¿Marcar como cobrado?
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>
              {Array.isArray(confirmCobrar.items) ? confirmCobrar.items.map(i => `${i.qty}× ${i.name}`).join(', ') : ''}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: C.accent, letterSpacing: -1, marginBottom: 24 }}>
              S/{Number(confirmCobrar.total).toFixed(2)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmCobrar(null)} disabled={cobrando} style={{
                flex: 1, padding: '14px', borderRadius: 12,
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14,
                cursor: 'pointer', textTransform: 'uppercase',
              }}>Volver</button>
              <button onClick={cobrarPedido} disabled={cobrando} style={{
                flex: 2, padding: '14px', borderRadius: 12, border: 0,
                background: cobrando ? '#333' : 'rgba(34,197,94,0.9)',
                color: cobrando ? '#777' : '#fff',
                fontFamily: FONT, fontWeight: 800, fontSize: 14,
                cursor: cobrando ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                {cobrando ? 'Guardando...' : '✓ Sí, cobrado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cancelar */}
      {confirmCancelar && (
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
              {tipoLabel(confirmCancelar)} · #{confirmCancelar.numero}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 4 }}>
              ¿Cancelar pedido?
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>
              {Array.isArray(confirmCancelar.items) ? confirmCancelar.items.map(i => `${i.qty}× ${i.name}`).join(', ') : ''}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: C.dim, letterSpacing: -1, marginBottom: 6, textDecoration: 'line-through' }}>
              S/{Number(confirmCancelar.total).toFixed(2)}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 24 }}>
              Quedará registrado y no contará en las ventas del día.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmCancelar(null)} disabled={cancelando} style={{
                flex: 1, padding: '14px', borderRadius: 12,
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14,
                cursor: 'pointer', textTransform: 'uppercase',
              }}>Volver</button>
              <button onClick={cancelarPedido} disabled={cancelando} style={{
                flex: 2, padding: '14px', borderRadius: 12, border: 0,
                background: cancelando ? '#333' : 'rgba(239,68,68,0.9)',
                color: cancelando ? '#777' : '#fff',
                fontFamily: FONT, fontWeight: 800, fontSize: 14,
                cursor: cancelando ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                {cancelando ? 'Cancelando...' : '✕ Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
