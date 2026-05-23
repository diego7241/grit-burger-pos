import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getConfig, setConfig, invalidarMenuCache, CATEGORY_META } from '../lib/menuDB'
import { C, FONT, DISPLAY } from '../lib/theme'

const CATEGORIAS = Object.keys(CATEGORY_META)

export default function Admin({ onBack }) {
  const [status, setStatus]       = useState('loading') // loading | pin | dashboard
  const [adminPin, setAdminPin]   = useState('1234')
  const [pinInput, setPinInput]   = useState('')
  const [pinError, setPinError]   = useState(false)
  const [tab, setTab]             = useState('mesas')
  const [numMesas, setNumMesas]   = useState(4)
  const [items, setItems]         = useState([])
  const [editingPrice, setEditingPrice] = useState(null) // { id, val }
  const [saving, setSaving]       = useState(false)
  const [newItem, setNewItem]     = useState({ name: '', descripcion: '', price: '', categoria: 'hamburguesas' })
  const [addMsg, setAddMsg]       = useState(null) // { ok, text }
  const [confirmDel, setConfirmDel] = useState(null) // item id

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [pin, mesas, { data }] = await Promise.all([
      getConfig('admin_pin'),
      getConfig('num_mesas'),
      supabase.from('menu_items').select('*').order('orden'),
    ])
    if (pin)   setAdminPin(pin)
    if (mesas) setNumMesas(Number(mesas))
    if (data)  setItems(data)
    setStatus('pin')
  }

  // ── PIN ──────────────────────────────────────────────────
  const handlePin = (d) => {
    setPinError(false)
    const next = (pinInput + d).slice(0, 4)
    setPinInput(next)
    if (next.length === 4) {
      if (next === adminPin) {
        setStatus('dashboard')
      } else {
        setPinError(true)
        setTimeout(() => setPinInput(''), 500)
      }
    }
  }

  const handleDel = () => { setPinError(false); setPinInput(p => p.slice(0, -1)) }

  // ── MESAS ────────────────────────────────────────────────
  const changeMesas = async (delta) => {
    const next = Math.max(1, Math.min(12, numMesas + delta))
    setNumMesas(next)
    await setConfig('num_mesas', next)
    invalidarMenuCache()
  }

  // ── MENÚ — disponible ────────────────────────────────────
  const toggleDisponible = async (item) => {
    const next = !item.disponible
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, disponible: next } : i))
    await supabase.from('menu_items').update({ disponible: next }).eq('id', item.id)
    invalidarMenuCache()
  }

  // ── MENÚ — precio ────────────────────────────────────────
  const startEditPrice = (item) => setEditingPrice({ id: item.id, val: String(item.price) })

  const commitPrice = async () => {
    if (!editingPrice) return
    const price = parseFloat(editingPrice.val)
    if (isNaN(price) || price <= 0) { setEditingPrice(null); return }
    setItems(prev => prev.map(i => i.id === editingPrice.id ? { ...i, price } : i))
    await supabase.from('menu_items').update({ price }).eq('id', editingPrice.id)
    invalidarMenuCache()
    setEditingPrice(null)
  }

  // ── MENÚ — eliminar ──────────────────────────────────────
  const deleteItem = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('menu_items').delete().eq('id', id)
    invalidarMenuCache()
    setConfirmDel(null)
  }

  // ── NUEVO ITEM ───────────────────────────────────────────
  const submitNew = async () => {
    const { name, descripcion, price, categoria } = newItem
    if (!name.trim() || !price || isNaN(parseFloat(price))) {
      setAddMsg({ ok: false, text: 'Nombre y precio son obligatorios' })
      return
    }
    setSaving(true)
    const id = `${categoria}_${Date.now()}`
    const maxOrden = items.filter(i => i.categoria === categoria).reduce((m, i) => Math.max(m, i.orden), 0)
    const row = { id, categoria, name: name.trim(), descripcion: descripcion.trim(), price: parseFloat(price), disponible: true, orden: maxOrden + 1 }
    const { error } = await supabase.from('menu_items').insert(row)
    setSaving(false)
    if (error) {
      setAddMsg({ ok: false, text: 'Error al guardar' })
    } else {
      setItems(prev => [...prev, row])
      invalidarMenuCache()
      setNewItem({ name: '', descripcion: '', price: '', categoria })
      setAddMsg({ ok: true, text: `"${row.name}" agregado` })
      setTimeout(() => setAddMsg(null), 3000)
    }
  }

  // ── RENDER ───────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ width: '100%', height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontFamily: FONT, fontWeight: 700 }}>Cargando...</div>
      </div>
    )
  }

  if (status === 'pin') {
    return (
      <div style={{ width: '100%', height: '100vh', background: C.bg, color: C.text, fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <button onClick={onBack} style={{ position: 'absolute', top: 54, left: 18, width: 38, height: 38, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: 20 }}>‹</button>

        <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 6 }}>Admin</div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 32 }}>Ingresa el PIN</div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 40 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: '50%',
              background: pinInput.length > i ? (pinError ? '#ef4444' : C.accent) : C.border,
              transition: 'background .15s',
            }} />
          ))}
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 10 }}>
          {['1','2','3','4','5','6','7','8','9','⌫','0',''].map((d, i) => (
            <button key={i} onClick={() => d === '⌫' ? handleDel() : d ? handlePin(d) : null}
              disabled={!d && d !== '0'}
              style={{
                height: 64, borderRadius: 14,
                background: d === '⌫' ? 'transparent' : C.card,
                border: `1px solid ${d === '⌫' ? 'transparent' : C.border}`,
                color: C.text, fontFamily: DISPLAY, fontSize: d === '⌫' ? 20 : 24,
                cursor: d ? 'pointer' : 'default', opacity: !d ? 0 : 1,
              }}>{d}</button>
          ))}
        </div>

        {pinError && (
          <div style={{ marginTop: 20, fontSize: 12, color: '#ef4444', fontWeight: 700 }}>PIN incorrecto</div>
        )}
      </div>
    )
  }

  // Dashboard
  const byCategoria = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.categoria === cat)
    return acc
  }, {})

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: C.bg, color: C.text, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '54px 18px 14px', borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: 20 }}>‹</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>Panel</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.3 }}>Admin</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {[['mesas','⊞ Mesas'],['menu','🍔 Menú'],['nuevo','＋ Nuevo']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '6px 14px', borderRadius: 8,
              background: tab === id ? C.accent : C.bg,
              color: tab === id ? '#fff' : C.muted,
              fontFamily: FONT, fontWeight: 800, fontSize: 11,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
              border: `1px solid ${tab === id ? C.accent : C.border}`,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 40px' }}>

        {/* ── MESAS ── */}
        {tab === 'mesas' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 20 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>Cantidad de mesas</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <button onClick={() => changeMesas(-1)} disabled={numMesas <= 1} style={{
                width: 60, height: 60, borderRadius: 16,
                background: numMesas <= 1 ? C.border : C.card,
                border: `1px solid ${C.border}`, color: numMesas <= 1 ? C.dim : C.text,
                fontFamily: DISPLAY, fontSize: 28, cursor: numMesas <= 1 ? 'default' : 'pointer',
              }}>−</button>
              <div style={{ fontFamily: DISPLAY, fontSize: 72, color: C.accent, lineHeight: 1, minWidth: 80, textAlign: 'center' }}>{numMesas}</div>
              <button onClick={() => changeMesas(+1)} disabled={numMesas >= 12} style={{
                width: 60, height: 60, borderRadius: 16,
                background: numMesas >= 12 ? C.border : C.card,
                border: `1px solid ${C.border}`, color: numMesas >= 12 ? C.dim : C.text,
                fontFamily: DISPLAY, fontSize: 28, cursor: numMesas >= 12 ? 'default' : 'pointer',
              }}>+</button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Máx. 12 mesas · Se guarda automáticamente</div>

            {/* Preview de mesas */}
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
              {Array.from({ length: numMesas }, (_, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Mesa</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 28 }}>{i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MENÚ ── */}
        {tab === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {CATEGORIAS.map(cat => {
              const catItems = byCategoria[cat]
              if (!catItems?.length) return null
              const meta = CATEGORY_META[cat]
              return (
                <div key={cat} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, color: C.accent, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                    {meta.emoji} {meta.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {catItems.map(item => (
                      <div key={item.id} style={{
                        background: item.disponible ? C.card : 'rgba(239,68,68,0.04)',
                        border: `1px solid ${item.disponible ? C.border : 'rgba(239,68,68,0.2)'}`,
                        borderRadius: 12, padding: '10px 12px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        opacity: item.disponible ? 1 : 0.6,
                      }}>
                        {/* Nombre */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, textDecoration: item.disponible ? 'none' : 'line-through' }}>
                            {item.name}
                          </div>
                          {!item.disponible && (
                            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 1 }}>AGOTADO</div>
                          )}
                        </div>

                        {/* Precio (tap para editar) */}
                        {editingPrice?.id === item.id ? (
                          <input
                            autoFocus
                            value={editingPrice.val}
                            onChange={e => setEditingPrice(p => ({ ...p, val: e.target.value }))}
                            onBlur={commitPrice}
                            onKeyDown={e => e.key === 'Enter' && commitPrice()}
                            style={{
                              width: 70, background: C.bg,
                              border: `1px solid ${C.accent}`, borderRadius: 8,
                              padding: '4px 8px', color: C.text, fontFamily: DISPLAY,
                              fontSize: 14, outline: 'none', textAlign: 'center',
                            }}
                          />
                        ) : (
                          <button onClick={() => startEditPrice(item)} style={{
                            background: 'transparent', border: `1px solid ${C.border}`,
                            borderRadius: 8, padding: '4px 8px',
                            color: C.accent, fontFamily: DISPLAY, fontSize: 14,
                            cursor: 'pointer', minWidth: 60, textAlign: 'center',
                          }}>S/{Number(item.price).toFixed(2)}</button>
                        )}

                        {/* Toggle disponible */}
                        <button onClick={() => toggleDisponible(item)} style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: item.disponible ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${item.disponible ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          color: item.disponible ? C.green : '#ef4444',
                          fontSize: 16, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{item.disponible ? '✓' : '✕'}</button>

                        {/* Eliminar */}
                        <button onClick={() => setConfirmDel(item.id)} style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          background: 'transparent', border: `1px solid ${C.border}`,
                          color: C.dim, fontSize: 14, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>🗑</button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── NUEVO ── */}
        {tab === 'nuevo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              Nuevo producto
            </div>

            {/* Categoría */}
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Categoría</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIAS.map(cat => (
                  <button key={cat} onClick={() => setNewItem(p => ({ ...p, categoria: cat }))} style={{
                    padding: '5px 12px', borderRadius: 8,
                    background: newItem.categoria === cat ? C.accent : C.card,
                    color: newItem.categoria === cat ? '#fff' : C.muted,
                    border: `1px solid ${newItem.categoria === cat ? C.accent : C.border}`,
                    fontFamily: FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre */}
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Nombre *</div>
              <input
                placeholder="Ej: BBQ Mango"
                value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                style={inputStyle()}
              />
            </div>

            {/* Descripción */}
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Descripción</div>
              <input
                placeholder="Ej: 6 alitas + papas"
                value={newItem.descripcion}
                onChange={e => setNewItem(p => ({ ...p, descripcion: e.target.value }))}
                style={inputStyle()}
              />
            </div>

            {/* Precio */}
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Precio (S/) *</div>
              <input
                placeholder="0.00"
                type="number"
                min="0"
                step="0.50"
                value={newItem.price}
                onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
                style={inputStyle()}
              />
            </div>

            {addMsg && (
              <div style={{ fontSize: 12, fontWeight: 700, color: addMsg.ok ? C.green : '#ef4444' }}>
                {addMsg.ok ? '✓ ' : '⚠ '}{addMsg.text}
              </div>
            )}

            <button onClick={submitNew} disabled={saving} style={{
              padding: '14px', borderRadius: 12, border: 0,
              background: saving ? '#333' : C.accent,
              color: saving ? '#777' : '#fff',
              fontFamily: FONT, fontWeight: 800, fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: 0.3,
            }}>
              {saving ? 'Guardando...' : '+ Agregar producto'}
            </button>
          </div>
        )}
      </div>

      {/* Modal confirmar eliminar */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 200, fontFamily: FONT }}>
          <div style={{ width: '100%', background: C.card, borderRadius: '20px 20px 0 0', padding: '24px 20px 44px', borderTop: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, textTransform: 'uppercase', marginBottom: 6 }}>¿Eliminar producto?</div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 6 }}>
              {items.find(i => i.id === confirmDel)?.name}
            </div>
            <div style={{ fontSize: 11, color: C.dim, fontWeight: 600, marginBottom: 24 }}>
              Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontFamily: FONT, fontWeight: 700, fontSize: 14, cursor: 'pointer', textTransform: 'uppercase' }}>Cancelar</button>
              <button onClick={() => deleteItem(confirmDel)} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 0, background: '#ef4444', color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer', textTransform: 'uppercase' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function inputStyle() {
  return {
    width: '100%', background: '#1a1a1a',
    border: `1px solid #2a2a2a`, borderRadius: 12,
    padding: '12px 14px', color: '#fff', fontFamily: "'Archivo', system-ui, sans-serif",
    fontWeight: 700, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
}
