import { useState } from 'react'
import { C, FONT, DISPLAY } from '../lib/theme'
import { MENU, MENU_CATEGORIES } from '../lib/menu'

export default function Pedido({ tipo, mesa, cliente, pedidoExistente, onConfirm, onBack }) {
  const [cat, setCat] = useState('hamburguesas')
  const [cart, setCart] = useState(() =>
    pedidoExistente?.items
      ? pedidoExistente.items.map((i, idx) => ({
          ...i, nota: i.nota || '',
          lineId: i.lineId || `${i.id}_${idx}_${Date.now()}`,
        }))
      : []
  )
  const [pago, setPago] = useState(pedidoExistente?.metodo_pago || null)
  const [notaAbierta, setNotaAbierta] = useState(null) // lineId
  const [confirmSalir, setConfirmSalir] = useState(false)

  const esEdicion = !!pedidoExistente?.id
  const titulo = tipo === 'mesa' ? `Mesa ${mesa}` : tipo === 'llevar' ? 'Para llevar' : 'WhatsApp'

  const handleBack = () => {
    if (cart.length > 0) setConfirmSalir(true)
    else onBack()
  }

  const add = (item) => {
    // Find last line of this item that has no note → increment it
    // If all lines have notes (or no lines) → create new line
    const linesForItem = cart.filter(c => c.id === item.id)
    const lastNoNote = [...linesForItem].reverse().find(c => !c.nota)
    if (lastNoNote) {
      setCart(prev => prev.map(c => c.lineId === lastNoNote.lineId ? { ...c, qty: c.qty + 1 } : c))
      setNotaAbierta(lastNoNote.lineId)
    } else {
      const lineId = `${item.id}_${Date.now()}`
      setCart(prev => [...prev, { ...item, qty: 1, nota: '', lineId }])
      setNotaAbierta(lineId)
    }
  }

  const remove = (lineId) => {
    setCart(prev => {
      const ex = prev.find(c => c.lineId === lineId)
      if (!ex) return prev
      if (ex.qty === 1) {
        setNotaAbierta(n => n === lineId ? null : n)
        return prev.filter(c => c.lineId !== lineId)
      }
      return prev.map(c => c.lineId === lineId ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const setNota = (lineId, nota) => {
    setCart(prev => prev.map(c => c.lineId === lineId ? { ...c, nota } : c))
  }

  const agregarComplemento = (comp, forLineId) => {
    setCart(prev => {
      const target = prev.find(c => c.lineId === forLineId)
      if (!target) return prev
      // Append extra name to note
      const notaActual = target.nota || ''
      const nuevoNombre = comp.name.toLowerCase()
      const nuevaNota = notaActual ? `${notaActual}, ${nuevoNombre}` : nuevoNombre
      const updated = prev.map(c => c.lineId === forLineId ? { ...c, nota: nuevaNota } : c)
      // Insert price line right after the target item
      const idx = updated.findIndex(c => c.lineId === forLineId)
      const compLine = { ...comp, qty: 1, nota: '', lineId: `${comp.id}_${Date.now()}`, isComplemento: true, parentLineId: forLineId }
      const result = [...updated]
      result.splice(idx + 1, 0, compLine)
      return result
    })
  }

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const canConfirm = cart.length > 0 && (tipo === 'mesa' ? true : !!pago)

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm({
      tipo, mesa, cliente,
      items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, nota: c.nota || '', lineId: c.lineId, isComplemento: c.isComplemento || false })),
      subtotal: total, total,
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
            const linesForItem = cart.filter(c => c.id === item.id)
            const totalQty = linesForItem.reduce((s, c) => s + c.qty, 0)
            const hasAny = linesForItem.length > 0
            const lastLine = linesForItem[linesForItem.length - 1]
            const notaVisible = hasAny && notaAbierta === lastLine?.lineId

            return (
              <div key={item.id} style={{
                background: hasAny ? 'rgba(255,107,0,0.08)' : C.card,
                border: `1px solid ${hasAny ? C.accent + '44' : C.border}`,
                borderRadius: 12, padding: '12px 14px', transition: 'all .15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2, lineHeight: 1.3 }}>{item.desc}</div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 15, color: C.accent, marginTop: 4 }}>S/{item.price.toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {hasAny && (
                      <>
                        <button onClick={() => lastLine && remove(lastLine.lineId)} style={qtyBtn(C.border)}>−</button>
                        <span style={{ fontFamily: DISPLAY, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{totalQty}</span>
                      </>
                    )}
                    <button onClick={() => add(item)} style={qtyBtn(C.accent, C.accent)}>+</button>
                    {hasAny && (
                      <button
                        onClick={() => setNotaAbierta(notaAbierta === lastLine?.lineId ? null : lastLine?.lineId)}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: `1px solid ${lastLine?.nota ? C.accent : C.border}`,
                          background: lastLine?.nota ? C.accentDim : 'transparent',
                          color: lastLine?.nota ? C.accent : C.muted,
                          cursor: 'pointer', fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>📝</button>
                    )}
                  </div>
                </div>

                {/* Nota de la última línea (editable) */}
                {notaVisible && lastLine && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      autoFocus
                      placeholder="Ej: sin tomate, partido en 2..."
                      value={lastLine.nota || ''}
                      onChange={e => setNota(lastLine.lineId, e.target.value)}
                      style={{
                        width: '100%', background: '#1a1a1a',
                        border: `1px solid ${C.accent}66`, borderRadius: 8,
                        padding: '8px 12px', color: C.text, fontFamily: FONT,
                        fontWeight: 600, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    {/* Chips de complementos */}
                    <div style={{
                      display: 'flex', gap: 6, overflowX: 'auto',
                      marginTop: 8, paddingBottom: 2, scrollbarWidth: 'none',
                    }}>
                      {MENU.complementos.items.map(comp => (
                        <button
                          key={comp.id}
                          onClick={() => agregarComplemento(comp, lastLine.lineId)}
                          style={{
                            flexShrink: 0, padding: '5px 10px', borderRadius: 8,
                            background: C.bg, border: `1px solid ${C.border}`,
                            color: C.muted, fontFamily: FONT, fontWeight: 700,
                            fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}
                        >
                          + {comp.name}
                          <span style={{ color: C.accent, fontFamily: DISPLAY, fontSize: 11 }}>
                            S/{comp.price % 1 === 0 ? comp.price : comp.price.toFixed(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                    {lastLine.nota && (
                      <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginTop: 6, letterSpacing: 0.5 }}>
                        ✓ Nota guardada
                      </div>
                    )}
                  </div>
                )}

                {/* Notas de todas las líneas (lectura) */}
                {!notaVisible && linesForItem.map(line =>
                  line.nota ? (
                    <div key={line.lineId} style={{
                      marginTop: 8, padding: '5px 10px', background: C.accentDim, borderRadius: 6,
                      fontSize: 11, color: C.accent, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      📝 {line.qty > 1 ? `${line.qty}×` : ''} {line.nota}
                    </div>
                  ) : null
                )}

                {/* Indicador de líneas múltiples */}
                {linesForItem.length > 1 && (
                  <div style={{ marginTop: 6, fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>
                    {linesForItem.length} variantes · toca + para agregar otra
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
          <div style={{ marginBottom: 10, maxHeight: 100, overflowY: 'auto' }}>
            {cart.map(c => (
              <div key={c.lineId} style={{ padding: '2px 0' }}>
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

        {/* Total */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 20, color: cart.length ? C.text : C.dim }}>S/{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Métodos de pago — solo para llevar/WA, mesa paga al cobrar */}
        {tipo !== 'mesa' && (
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
        )}

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
          {cart.length === 0
            ? 'Agrega productos'
            : !canConfirm
            ? 'Elige método de pago'
            : `${esEdicion ? 'Actualizar' : 'Confirmar'} · S/${total.toFixed(2)}`}
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
