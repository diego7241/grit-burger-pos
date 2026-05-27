import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, FONT, DISPLAY, WHATSAPP_COCINA } from '../lib/theme'
import { bluetoothDisponible, conectarImpresora, imprimirTicket, pruebaImprimir } from '../lib/printer'

const PAGO_COLORS = { yape: C.yape, plin: C.plin, tarjeta: '#2563eb', efectivo: '#16a34a' }

export default function Ticket({ pedido, onVolver }) {
  const [guardado, setGuardado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagoEfectivo, setPagoEfectivo] = useState('')
  const [imprimiendo, setImprimiendo] = useState(false)
  const [nombreImpresora, setNombreImpresora] = useState(null)
  const [errorImpresora, setErrorImpresora] = useState(null)

  const esActualizacion = !!pedido.pedidoExistenteId

  useEffect(() => {
    guardarPedido()
  }, [])

  const guardarPedido = async () => {
    setLoading(true)
    setError(null)
    try {
      let result
      if (esActualizacion) {
        result = await supabase
          .from('pedidos')
          .update({
            items: pedido.items,
            subtotal: pedido.subtotal,
            total: pedido.total,
            metodo_pago: pedido.metodo_pago,
            notas: pedido.notas || null,
          })
          .eq('id', pedido.pedidoExistenteId)
          .select()
          .single()
      } else {
        result = await supabase
          .from('pedidos')
          .insert([{
            tipo: pedido.tipo,
            mesa: pedido.mesa || null,
            cliente: pedido.cliente || null,
            items: pedido.items,
            subtotal: pedido.subtotal,
            total: pedido.total,
            metodo_pago: pedido.metodo_pago,
            notas: pedido.notas || null,
            estado: 'confirmado',
          }])
          .select()
          .single()
      }
      if (result.error) setError(result.error.message)
      else setGuardado(result.data)
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleImprimir = async () => {
    if (!guardado) return
    setImprimiendo(true)
    setErrorImpresora(null)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo agotado. Intenta de nuevo.')), 45000)
    )
    try {
      if (!nombreImpresora) {
        const nombre = await conectarImpresora()
        setNombreImpresora(nombre)
      }
      await Promise.race([imprimirTicket(pedido, guardado.numero), timeout])
    } catch (e) {
      setErrorImpresora(e.message)
      // Solo desconectar si es error real de BLE, no si fue timeout
      if (!e.message.includes('Tiempo agotado')) setNombreImpresora(null)
    } finally {
      setImprimiendo(false)
    }
  }

  const enviarWhatsApp = () => {
    if (!guardado) return

    const tipoBase = pedido.tipo === 'mesa' ? `🍽 MESA ${pedido.mesa}` :
      pedido.tipo === 'llevar' ? `🛵 PARA LLEVAR${pedido.cliente ? ` — ${pedido.cliente}` : ''}` :
      `📱 WHATSAPP${pedido.cliente ? ` — ${pedido.cliente}` : ''}`

    const titulo = esActualizacion ? `🔄 ACTUALIZACIÓN · ${tipoBase}` : tipoBase

    const items = pedido.items.map(i => {
      if (i.isComplemento) return `     ↳ + ${i.name} — S/${(i.price * i.qty).toFixed(2)}`
      const compKids = pedido.items.filter(x => x.isComplemento && x.parentLineId === i.lineId)
      const notaLimpia = compKids.reduce(
        (n, comp) => n.replace(new RegExp(`,?\\s*${comp.name}`, 'i'), '').replace(/^,\s*/, '').trim(),
        i.nota || ''
      )
      const linea = `  ${i.qty}× ${i.name} — S/${(i.price * i.qty).toFixed(2)}`
      return notaLimpia ? `${linea}\n     📝 ${notaLimpia}` : linea
    }).join('\n')

    const pago = pedido.metodo_pago.toUpperCase()
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

    const totales = pedido.servicio > 0
      ? `Subtotal: S/${pedido.subtotal.toFixed(2)}\nServicio (10%): S/${pedido.servicio.toFixed(2)}\n*TOTAL: S/${pedido.total.toFixed(2)}*`
      : `*TOTAL: S/${pedido.total.toFixed(2)}*`

    const msg = `🔥 *GRIT BURGER POS*
*${titulo}*
Ticket #${guardado.numero} · ${hora}

${items}

${totales}
Pago: ${pago}
${pedido.notas ? `\n📝 Nota: ${pedido.notas}` : ''}`

    window.location.href = `https://wa.me/${WHATSAPP_COCINA}?text=${encodeURIComponent(msg)}`
  }

  // Calculadora de vuelto
  const montoEfectivo = pagoEfectivo !== '' ? parseFloat(pagoEfectivo) : null
  const vuelto = montoEfectivo !== null ? montoEfectivo - pedido.total : null

  if (loading) return (
    <div style={{ width: '100%', height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14 }}>
        {esActualizacion ? 'Actualizando pedido...' : 'Guardando pedido...'}
      </div>
    </div>
  )

  if (error) return (
    <div style={{ width: '100%', height: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
      <div style={{ color: '#ef4444', fontFamily: FONT, fontWeight: 700, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
        {error}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={guardarPedido} style={{
          background: C.accent, color: '#fff', border: 0, borderRadius: 10,
          padding: '12px 24px', fontFamily: FONT, fontWeight: 800, cursor: 'pointer',
          textTransform: 'uppercase', fontSize: 13,
        }}>
          Reintentar
        </button>
        <button onClick={onVolver} style={{
          background: 'transparent', color: C.muted,
          border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '12px 24px', fontFamily: FONT, fontWeight: 700, cursor: 'pointer',
          textTransform: 'uppercase', fontSize: 13,
        }}>
          Volver
        </button>
      </div>
    </div>
  )

  const tituloLabel = pedido.tipo === 'mesa' ? `Mesa ${pedido.mesa}` :
    pedido.tipo === 'llevar'
      ? (pedido.cliente ? `Llevar · ${pedido.cliente}` : 'Para llevar')
      : (pedido.cliente ? `WA · ${pedido.cliente}` : 'WhatsApp')

  return (
    <div style={{
      width: '100%', minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: FONT, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '54px 18px 16px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: C.green, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
            ✓ {esActualizacion ? 'Pedido actualizado' : 'Pedido confirmado'}
          </span>
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3, marginTop: 2 }}>
          Ticket #{guardado?.numero}
        </div>
      </div>

      {/* Ticket papel */}
      <div style={{ flex: 1, padding: '16px 18px', overflowY: 'auto' }}>
        <div style={{
          background: '#fff', color: '#1a1a1a', borderRadius: 16,
          padding: '20px 18px', fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, textTransform: 'uppercase', letterSpacing: -0.5 }}>Grit Burger</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Sistema POS</div>
          </div>

          <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 700 }}>{tituloLabel}</span>
            <span>#{guardado?.numero}</span>
          </div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
            {new Date().toLocaleDateString('es-PE')} · {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
          </div>

          <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '10px 0', margin: '10px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {'CANT  PRODUCTO              IMPORTE'}
            </div>
            {pedido.items.map((item, i) => {
              if (item.isComplemento) return (
                <div key={i} style={{ paddingLeft: 16, marginBottom: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
                    <span>↳ + {item.name}</span>
                    <span>S/{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                </div>
              )
              const compKids = pedido.items.filter(x => x.isComplemento && x.parentLineId === item.lineId)
              const notaLimpia = compKids.reduce(
                (n, comp) => n.replace(new RegExp(`,?\\s*${comp.name}`, 'i'), '').replace(/^,\s*/, '').trim(),
                item.nota || ''
              )
              return (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                    <span>{item.qty}× {item.name}</span>
                    <span>S/{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                  {notaLimpia && (
                    <div style={{ fontSize: 10, color: '#FF6B00', paddingLeft: 16, marginTop: 2, fontWeight: 600 }}>
                      📝 {notaLimpia}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {pedido.servicio > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Subtotal</span>
                <span style={{ fontSize: 12 }}>S/{pedido.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>Servicio (10%)</span>
                <span style={{ fontSize: 12 }}>S/{pedido.servicio.toFixed(2)}</span>
              </div>
            </>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, borderTop: '1px solid #ccc', paddingTop: 8 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 16 }}>TOTAL</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 16, color: C.accent }}>S/{pedido.total.toFixed(2)}</span>
          </div>

          <div style={{
            background: PAGO_COLORS[pedido.metodo_pago] + '22',
            border: `1px solid ${PAGO_COLORS[pedido.metodo_pago]}44`,
            borderRadius: 8, padding: '6px 10px', textAlign: 'center',
            color: PAGO_COLORS[pedido.metodo_pago], fontWeight: 900, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            Método de pago: {pedido.metodo_pago}
          </div>

          {pedido.notas && (
            <div style={{ marginTop: 10, padding: '8px', background: '#fff8e1', borderRadius: 8, fontSize: 11, color: '#666' }}>
              📝 {pedido.notas}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: '#999' }}>
            ¡Gracias por tu compra!<br />gritburguer.vercel.app
          </div>
        </div>

        {/* Calculadora de vuelto — solo efectivo */}
        {pedido.metodo_pago === 'efectivo' && (
          <div style={{
            marginTop: 12, background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Calculadora de vuelto
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: C.muted, fontWeight: 700, flexShrink: 0 }}>Paga con S/</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={pagoEfectivo}
                onChange={e => setPagoEfectivo(e.target.value)}
                style={{
                  flex: 1, background: C.bg,
                  border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: '10px 14px', color: C.text,
                  fontFamily: DISPLAY, fontSize: 20,
                  outline: 'none', textAlign: 'right',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {vuelto !== null && (
              <div style={{
                marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: vuelto >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${vuelto >= 0 ? '#22c55e44' : '#ef444444'}`,
                borderRadius: 10, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {vuelto >= 0 ? 'Vuelto' : 'Falta'}
                </span>
                <span style={{ fontFamily: DISPLAY, fontSize: 24, color: vuelto >= 0 ? C.green : '#ef4444' }}>
                  S/{Math.abs(vuelto).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botones */}
      <div style={{ padding: '12px 18px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bluetoothDisponible() && (
          <>
            <button onClick={handleImprimir} disabled={imprimiendo || !guardado} style={{
              width: '100%', border: 0, padding: '16px', borderRadius: 14,
              background: imprimiendo ? '#333' : '#1a1a2e',
              border: `1px solid ${nombreImpresora ? '#6366f1' : C.border}`,
              color: imprimiendo ? '#777' : nombreImpresora ? '#a5b4fc' : C.muted,
              fontFamily: FONT, fontWeight: 800, fontSize: 15,
              cursor: imprimiendo ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              🖨 {imprimiendo ? 'Imprimiendo...' : nombreImpresora ? `Imprimir (${nombreImpresora})` : 'Imprimir ticket'}
            </button>
            {errorImpresora && (
              <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', fontWeight: 600, marginTop: -4 }}>
                {errorImpresora}
              </div>
            )}
            {nombreImpresora && (
              <button onClick={async () => {
                try { await pruebaImprimir() } catch (e) { setErrorImpresora(e.message) }
              }} style={{
                width: '100%', border: `1px solid #333`, padding: '10px', borderRadius: 10,
                background: 'transparent', color: '#555',
                fontFamily: FONT, fontWeight: 700, fontSize: 11,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                🖨 Prueba texto plano
              </button>
            )}
          </>
        )}
        <button onClick={enviarWhatsApp} style={{
          width: '100%', border: 0, padding: '16px', borderRadius: 14,
          background: '#22c55e', color: '#fff',
          fontFamily: FONT, fontWeight: 800, fontSize: 15,
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
          boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          📲 Enviar a cocina por WhatsApp
        </button>
        <button onClick={onVolver} style={{
          width: '100%', border: `1px solid ${C.border}`, padding: '14px', borderRadius: 14,
          background: 'transparent', color: C.muted,
          fontFamily: FONT, fontWeight: 700, fontSize: 14,
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          ← Volver al panel
        </button>
      </div>
    </div>
  )
}
