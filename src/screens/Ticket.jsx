import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, FONT, DISPLAY, WHATSAPP_COCINA } from '../lib/theme'

export default function Ticket({ pedido, onVolver, onNuevoPedido }) {
  const [guardado, setGuardado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    guardarPedido()
  }, [])

  const guardarPedido = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
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

    if (err) setError(err.message)
    else setGuardado(data)
    setLoading(false)
  }

  const enviarWhatsApp = () => {
    if (!guardado) return
    const titulo = pedido.tipo === 'mesa' ? `🍽 MESA ${pedido.mesa}` :
      pedido.tipo === 'llevar' ? `🛵 PARA LLEVAR${pedido.cliente ? ` — ${pedido.cliente}` : ''}` :
      `📱 WHATSAPP${pedido.cliente ? ` — ${pedido.cliente}` : ''}`

    const items = pedido.items.map(i => {
      const linea = `  ${i.qty}× ${i.name} — S/${(i.price * i.qty).toFixed(2)}`
      return i.nota ? `${linea}\n     📝 ${i.nota}` : linea
    }).join('\n')
    const pago = pedido.metodo_pago.toUpperCase()
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

    const msg = `🔥 *GRIT BURGER POS*
*${titulo}*
Ticket #${guardado.numero} · ${hora}

${items}

*TOTAL: S/${pedido.total.toFixed(2)}*
Pago: ${pago}
${pedido.notas ? `\n📝 Nota: ${pedido.notas}` : ''}`

    const url = `https://wa.me/${WHATSAPP_COCINA}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const PAGO_COLORS = { yape: C.yape, plin: C.plin, tarjeta: '#2563eb', efectivo: '#16a34a' }

  if (loading) return (
    <div style={{ width: '100%', height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14 }}>Guardando pedido...</div>
    </div>
  )

  if (error) return (
    <div style={{ width: '100%', height: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <div style={{ color: '#ef4444', fontFamily: FONT, fontWeight: 700, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
        Error al guardar: {error}
      </div>
      <button onClick={guardarPedido} style={{ background: C.accent, color: '#fff', border: 0, borderRadius: 10, padding: '12px 24px', fontFamily: FONT, fontWeight: 800, cursor: 'pointer' }}>
        Reintentar
      </button>
    </div>
  )

  const tituloLabel = pedido.tipo === 'mesa' ? `Mesa ${pedido.mesa}` :
    pedido.tipo === 'llevar' ? 'Para llevar' : 'WhatsApp'

  return (
    <div style={{
      width: '100%', minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: FONT, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '54px 18px 16px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: C.green, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>✓ Pedido confirmado</span>
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
          {/* Header ticket */}
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
            {pedido.items.map((item, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                  <span>{item.qty}× {item.name}</span>
                  <span>S/{(item.price * item.qty).toFixed(2)}</span>
                </div>
                {item.nota && (
                  <div style={{ fontSize: 10, color: '#FF6B00', paddingLeft: 16, marginTop: 2, fontWeight: 600 }}>
                    📝 {item.nota}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Subtotal</span>
            <span style={{ fontSize: 12 }}>S/{pedido.subtotal.toFixed(2)}</span>
          </div>
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
            ¡Gracias por tu compra!<br />gritburger.pe
          </div>
        </div>
      </div>

      {/* Botones */}
      <div style={{ padding: '12px 18px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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

const PAGO_COLORS = { yape: C.yape, plin: C.plin, tarjeta: '#2563eb', efectivo: '#16a34a' }
