import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, FONT, DISPLAY } from '../lib/theme'

const PAGO_COLORS = { yape: C.yape, plin: C.plin, tarjeta: '#2563eb', efectivo: '#16a34a' }
const FILTROS = ['todos', 'mesa', 'llevar', 'whatsapp']

export default function Historial({ onBack }) {
  const [pedidos, setPedidos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .gte('created_at', hoy)
      .order('created_at', { ascending: false })
    if (data) setPedidos(data)
    setLoading(false)
  }

  const filtrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.tipo === filtro)
  const totalHoy = pedidos.reduce((s, p) => s + Number(p.total), 0)

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
            { label: 'Pedidos', value: pedidos.length },
            { label: 'Total', value: `S/${totalHoy.toFixed(0)}` },
            { label: 'Promedio', value: pedidos.length ? `S/${(totalHoy / pedidos.length).toFixed(0)}` : 'S/0' },
          ].map(s => (
            <div key={s.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 18, color: C.accent }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTROS.map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: filtro === f ? C.accent : C.bg,
              color: filtro === f ? '#fff' : C.muted,
              fontFamily: FONT, fontWeight: 800, fontSize: 10,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
              border: `1px solid ${filtro === f ? C.accent : C.border}`,
            }}>
              {f === 'todos' ? 'Todos' : f === 'mesa' ? '🍽 Mesa' : f === 'llevar' ? '🛵 Llevar' : '📱 WhatsApp'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted, fontWeight: 700 }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
            <div style={{ fontSize: 36, opacity: 0.4 }}>📋</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 16, marginTop: 12, textTransform: 'uppercase' }}>Sin pedidos</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtrados.map(p => (
              <div key={p.id} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.2 }}>
                      {tipoLabel(p)} <span style={{ color: C.dim, fontSize: 11 }}>#{p.numero}</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, marginTop: 2 }}>
                      {new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 16, color: C.accent }}>S/{Number(p.total).toFixed(2)}</div>
                    <span style={{
                      background: (PAGO_COLORS[p.metodo_pago] || C.muted) + '22',
                      color: PAGO_COLORS[p.metodo_pago] || C.muted,
                      border: `1px solid ${(PAGO_COLORS[p.metodo_pago] || C.muted)}44`,
                      borderRadius: 4, padding: '2px 6px',
                      fontSize: 9, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase',
                    }}>{p.metodo_pago}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                  {Array.isArray(p.items) ? p.items.map(i => `${i.qty}× ${i.name}`).join(', ') : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}