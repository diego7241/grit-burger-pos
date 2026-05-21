import { useState } from 'react'
import { C, FONT, DISPLAY } from '../lib/theme'
import { MENU, MENU_CATEGORIES } from '../lib/menu'

export default function Pedido({ tipo, mesa, cliente, onConfirm, onBack }) {
  const [cat, setCat] = useState('hamburguesas')
  const [cart, setCart] = useState([])
  const [pago, setPago] = useState(null)
  const [notas, setNotas] = useState('')

  const titulo = tipo === 'mesa' ? `Mesa ${mesa}` : tipo === 'llevar' ? 'Para llevar' : 'WhatsApp'

  const add = (item) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id)
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const remove = (id) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === id)
      if (!ex) return prev
      if (ex.qty === 1) return prev.filter(c => c.id !== id)
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const canConfirm = cart.length > 0 && pago

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm({
      tipo, mesa, cliente,
      items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
      subtotal, total: subtotal,
      metodo_pago: pago,
      notas,
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
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: 10, background: C.bg,
            border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: 20,
          }}>‹</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
              {titulo}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, textTransform: 'uppercase', letterSpacing: -0.3 }}>
              Tomar pedido
            </div>
          </div>
          {cart.length > 0 && (
            <div style={{
              background: C.accent, color: '#fff', borderRadius: 8,
              padding: '4px 10px', fontFamily: DISPLAY, fontSize: 14,
            }}>{cart.length}</div>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: 0, overflowX: 'auto', padding: '10px 18px',
        borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        scrollbarWidth: 'none',
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
            return (
              <div key={item.id} style={{
                background: inCart ? 'rgba(255,107,0,0.08)' : C.card,
                border: `1px solid ${inCart ? C.accent + '44' : C.border}`,
                borderRadius: 12, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all .15s',
              }}>
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
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom panel */}
      <div style={{
        padding: '12px 18px 28px', borderTop: `1px solid ${C.border}`,
        background: C.card, flexShrink: 0,
      }}>
        {/* Cart summary */}
        {cart.length > 0 && (
          <div style={{ marginBottom: 10, maxHeight: 80, overflowY: 'auto' }}>
            {cart.map(c => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, fontWeight: 700, padding: '2px 0', color: C.muted,
              }}>
                <span><span style={{ color: C.accent }}>{c.qty}×</span> {c.name}</span>
                <span style={{ color: C.text }}>S/{(c.price * c.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Subtotal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 20, color: cart.length ? C.text : C.dim }}>
            S/{subtotal.toFixed(2)}
          </span>
        </div>

        {/* Métodos de pago */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
          {PAGOS.map(p => (
            <button key={p.id} onClick={() => setPago(p.id)} style={{
              padding: '8px 4px', borderRadius: 8, border: `1px solid ${pago === p.id ? p.color : C.border}`,
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
          {canConfirm ? `Confirmar pedido · S/${subtotal.toFixed(2)}` : 'Agrega productos y elige pago'}
        </button>
      </div>
    </div>
  )
}

function qtyBtn(borderColor, bg = 'transparent') {
  return {
    width: 32, height: 32, borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: bg === 'transparent' ? 'transparent' : bg,
    color: bg !== 'transparent' ? '#fff' : '#fff',
    fontSize: 18, cursor: 'pointer', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}