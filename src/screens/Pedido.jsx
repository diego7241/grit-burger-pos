import { useState } from 'react'
import { C, FONT, DISPLAY } from '../lib/theme'
import { MENU, MENU_CATEGORIES } from '../lib/menu'

export default function Pedido({ tipo, mesa, cliente, pedidoExistente, onConfirm, onBack }) {
  const [cat, setCat] = useState('hamburguesas')
  const [cart, setCart] = useState(() =>
    pedidoExistente?.items
      ? pedidoExistente.items.map(i => ({ ...i, nota: i.nota || '' }))
      : []
  )
  const [pago, setPago] = useState(pedidoExistente?.metodo_pago || null)
  const [notaAbierta, setNotaAbierta] = useState(null)
  const [confirmSalir, setConfirmSalir] = useState(false)
  const [conServicio, setConServicio] = useState(false)

  const esEdicion = !!pedidoExistente?.id
  const titulo = tipo === 'mesa' ? `Mesa ${mesa}` : tipo === 'llevar' ? 'Para llevar' : 'WhatsApp'

  const handleBack = () => {
    if (cart.length > 0) setConfirmSalir(true)
    else onBack()
  }

  const add = (item) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id)
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1, nota: '' }]
    })
    setNotaAbierta(item.id)
  }

  const remove = (id) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === id)
      if (!ex) return prev
      if (ex.qty === 1) {
        setNotaAbierta(n => n === id ? null : n)
        return prev.filter(c => c.id !== id)
      }
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const setNota = (id, nota) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, nota } : c))
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const servicio = conServicio ? Math.round(subtotal * 10) / 100 : 0
  const total = subtotal + servicio
  const canConfirm = cart.length > 0 && pago

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm({
      tipo, mesa, cliente,
      items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, nota: c.nota || '' })),
      subtotal, servicio, total,
      metodo_pago: pago,
      notas: cart.filter(c => c.nota).map(c => `${c.name}: ${c.nota}`).join(' | '),
      pedidoExistenteId: pedidoExistente?.id || null,
    })
  }

  const PAGOS = [
    { id: 'yape', label: 'Yape', color: C.yape },
    { id: 'plin', label: 'Plin', color: C.plin },
    { id: 'tarjeta', label: 'Tarjeta', color: '#2563eb' },
    { id: 'efectivo', label: 'Efectivo', color: '#16a34a' },
  ]

  const menuItems = MENU[cat]?.items || []

  return (
    <div style={{
      width: '100%', height: '100vh', background: C.bg, color: C.text,
      fontFamily: FONT, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '54px 18px 12px', borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleBack} style={{
            width: 38, height: 38, borderRadius: 10, background: C.bg,
            border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: 20,
          }}>‹</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
              {titulo}{esEdicion && <span style={{ marginLeft: 6, color: C.green }}>· editando</span>}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, textTransform: 'uppercase', letterSpacing: -0.3 }}>
              {esEdicion ? 'Agregar al pedido' : 'Tomar pedido'}
            </div>
          </div>
          {cart.length > 0 && (
            <div style={{
              background: C.accent, color: '#fff', borderRadius: 8,
              padding: '4px 10px', fontFamily: DISPLAY, fontSize: 14,
            }}>{cart.reduce((s, c) => s + c.qty, 0)}</div>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: 0, overflowX: 'auto', padding: '10px 18px',
        borderBottom: `1px solid ${C.border}`, flexShrink: 0, scrollbarWidth: 'none',
      }}>
        {MENU_CATEGORIES.map(key => (
          <button key={key} onClick={() => setCat(key)} style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: 'none',
            background: cat === key ? C.accent : 'transparent',
            color: cat === key ? '#fff' : C.muted,
            fontFamily: FONT, fontWeight: 800, fontSize: 11,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
            transition: 'all .15s', marginRight: 4,
          }}>
            {MENU[key].emoji} {MENU[key].label}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {menuItems.map(item => {
            const inCart = cart.find(c => c.id === item.id)
            const notaVisible = notaAbierta === item.id && inCart
            return (
              <div key={item.id} style={{
                background: inCart ? 'rgba(255,107,0,0.08)' : C.card,
                border: `1px solid ${inCart ? C.accent + '44' : C.border}`,
                borderRadius: 12, padding: '12px 14px', transition: 'all .15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2, lineHeight: 1.3 }}>{item.desc}</div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 15, color: C.accent, marginTop: 4 }}>S/{item.price.toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {inCart && (
                      <>
                        <button onClick={() => remove(item.id)} style={qtyBtn(C.border)}>−</button>
                        <span style={{ fontFamily: DISPLAY, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{inCart.qty}</span>
                      </>
                    )}
                    <button onClick={() => add(item)} style={qtyBtn(C.accent, C.accent)}>+</button>
                    {inCart && (
                      <button onClick={() => setNotaAbierta(notaAbierta === item.id ? null : item.id)} style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: `1px solid ${inCart.nota ? C.accent : C.border}`,
                        background: inCart.nota ? C.accentDim : 'transparent',
                        color: inCart.nota ? C.accent : C.muted,
                        cursor: 'pointer', fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>📝</button>
                    )}
                  </div>
                </div>

                {notaVisible && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      autoFocus
                      placeholder="Ej: mayo, ketchup, partido en 2, sin tomate..."
                      value={inCart.nota || ''}
                      onChange={e => setNota(item.id, e.target.value)}
                      style={{
                        width: '100%', background: '#1a1a1a',
                        border: `1px solid ${C.accent}66`, borderRadius: 8,
                        padding: '8px 12px', color: C.text, fontFamily: FONT,
                        fontWeight: 600, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    {inCart.nota && (
                      <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginTop: 4, letterSpacing: 0.5 }}>
                        ✓ Nota guardada
                      </div>
                    )}
                  </div>
                )}

                {!notaVisible && inCart?.nota && (
                  <div style={{
                    marginTop: 8, padding: '5px 10px', background: C.accentDim, borderRadius: 6,
                    fontSize: 11, color: C.accent, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    📝 {inCart.nota}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom panel */}
      <div style={{ padding: '12px 18px 28px', borderTop: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        {/* Resumen carrito */}
        {cart.length > 0 && (
          <div style={{ marginBottom: 10, maxHeight: 90, overflowY: 'auto' }}>
            {cart.map(c => (
              <div key={c.id} style={{ padding: '2px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: C.muted }}>
                  <span><span style={{ color: C.accent }}>{c.qty}×</span> {c.name}</span>
                  <span style={{ color: C.text }}>S/{(c.price * c.qty).toFixed(2)}</span>
                </div>
                {c.nota && (
                  <div style={{ fontSize: 10, color: C.accent, fontWeight: 600, paddingLeft: 16 }}>
                    📝 {c.nota}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Totales */}
        <div style={{ marginBottom: 10 }}>
          {conServicio ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>Subtotal</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 14, color: C.muted }}>S/{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>Servicio (10%)</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 14, color: C.muted }}>S/{servicio.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 20, color: cart.length ? C.text : C.dim }}>S/{total.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
              <span style={{ fontFamily: DISPLAY, fontSize: 20, color: cart.length ? C.text : C.dim }}>S/{subtotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Toggle cargo por servicio */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10, padding: '8px 12px',
          background: conServicio ? C.accentDim : 'transparent',
          border: `1px solid ${conServicio ? C.accent + '33' : C.border}`,
          borderRadius: 10, transition: 'all .15s',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: conServicio ? C.accent : C.muted }}>
            Cargo por servicio 10%
          </span>
          <button onClick={() => setConServicio(!conServicio)} style={{
            width: 42, height: 24, borderRadius: 12, border: 'none',
            background: conServicio ? C.accent : C.border,
            cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
              left: conServicio ? 21 : 3,
            }} />
          </button>
        </div>

        {/* Métodos de pago */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
          {PAGOS.map(p => (
            <button key={p.id} onClick={() => setPago(p.id)} style={{
              padding: '8px 4px', borderRadius: 8,
              border: `1px solid ${pago === p.id ? p.color : C.border}`,
              background: pago === p.id ? p.color : C.bg,
              color: pago === p.id ? '#fff' : C.muted,
              fontFamily: FONT, fontWeight: 800, fontSize: 11,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.3,
              transition: 'all .15s',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Confirmar */}
        <button onClick={handleConfirm} disabled={!canConfirm} style={{
          width: '100%', border: 0, padding: '15px', borderRadius: 14,
          background: canConfirm ? C.accent : '#333',
          color: canConfirm ? '#fff' : '#777',
          fontFamily: FONT, fontWeight: 800, fontSize: 15,
          cursor: canConfirm ? 'pointer' : 'not-allowed',
          textTransform: 'uppercase', letterSpacing: 0.5,
          boxShadow: canConfirm ? `0 8px 24px rgba(255,107,0,0.4)` : 'none',
          transition: 'all .15s',
        }}>
          {canConfirm
            ? `${esEdicion ? 'Actualizar' : 'Confirmar'} · S/${total.toFixed(2)}`
            : 'Agrega productos y elige pago'}
        </button>
      </div>

      {/* Modal confirmación salir */}
      {confirmSalir && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', zIndex: 100, fontFamily: FONT,
        }}>
          <div style={{
            width: '100%', background: C.card,
            borderRadius: '20px 20px 0 0', padding: '24px 20px 44px',
            borderTop: `1px solid ${C.border}`,
          }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 6 }}>
              ¿Salir sin confirmar?
            </div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 24 }}>
              Se perderá el carrito con {cart.reduce((s, c) => s + c.qty, 0)} productos
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onBack} style={{
                flex: 1, padding: '14px', borderRadius: 12,
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14,
                cursor: 'pointer', textTransform: 'uppercase',
              }}>Salir</button>
              <button onClick={() => setConfirmSalir(false)} style={{
                flex: 2, padding: '14px', borderRadius: 12,
                border: 0, background: C.accent, color: '#fff',
                fontFamily: FONT, fontWeight: 800, fontSize: 14,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.3,
                boxShadow: `0 8px 24px rgba(255,107,0,0.35)`,
              }}>Seguir editando</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function qtyBtn(borderColor, bg = 'transparent') {
  return {
    width: 32, height: 32, borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: bg === 'transparent' ? 'transparent' : bg,
    color: '#fff', fontSize: 18, cursor: 'pointer', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
