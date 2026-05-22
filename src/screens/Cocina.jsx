import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FONT = "'Archivo', system-ui, sans-serif"
const DISPLAY = "'Archivo Black', 'Archivo', sans-serif"
const ACCENT = '#FF6B00'

function inicioHoyLima() {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  return `${hoy}T05:00:00.000Z`
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
  if (mins >= 25) return '#ef4444'
  if (mins >= 15) return '#f59e0b'
  return ACCENT
}

function tipoLabel(p) {
  if (p.tipo === 'mesa') return `Mesa ${p.mesa}`
  if (p.tipo === 'llevar') return p.cliente ? `Llevar — ${p.cliente}` : 'Para llevar'
  return p.cliente ? `WA — ${p.cliente}` : 'WhatsApp'
}

export default function Cocina() {
  const [pedidos, setPedidos] = useState([])
  const [now, setNow] = useState(new Date())
  const [marcando, setMarcando] = useState(null)
  const [conectado, setConectado] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .gte('created_at', inicioHoyLima())
      .eq('estado', 'confirmado')
      .eq('listo', false)
      .order('created_at', { ascending: true })
    setConectado(!error)
    if (data) setPedidos(data)
  }, [])

  useEffect(() => {
    cargar()
    const channel = supabase
      .channel('cocina-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, cargar)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [cargar])

  const marcarListo = async (id) => {
    setMarcando(id)
    await supabase.from('pedidos').update({ listo: true }).eq('id', id)
    setMarcando(null)
  }

  const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const segundos = now.getSeconds().toString().padStart(2, '0')

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      background: '#f0f0f0', fontFamily: FONT,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        background: '#111', padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            color: ACCENT, fontFamily: DISPLAY, fontSize: 18,
            textTransform: 'uppercase', letterSpacing: -0.3,
          }}>
            Grit Burger
          </div>
          <div style={{
            background: '#222', border: '1px solid #333',
            borderRadius: 6, padding: '2px 10px',
            color: '#888', fontSize: 10, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: 2,
          }}>
            Cocina
          </div>
          {!conectado && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6, padding: '2px 10px',
              color: '#ef4444', fontSize: 10, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              Sin conexión
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 28, color: '#fff', letterSpacing: -1 }}>{hora}</span>
          <span style={{ fontSize: 16, color: '#555', fontVariantNumeric: 'tabular-nums' }}>:{segundos}</span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: DISPLAY, fontSize: 22,
            color: pedidos.length > 0 ? ACCENT : '#22c55e',
          }}>
            {pedidos.length}
          </div>
          <div style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            {pedidos.length === 1 ? 'pendiente' : 'pendientes'}
          </div>
        </div>
      </div>

      {/* Orders */}
      <div style={{
        flex: 1, padding: 14, overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12, alignContent: 'start',
      }}>

        {pedidos.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '80px 20px', color: '#aaa',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 24, color: '#22c55e', textTransform: 'uppercase', letterSpacing: -0.5 }}>
              Todo al día
            </div>
            <div style={{ fontSize: 14, color: '#bbb', marginTop: 6, fontWeight: 600 }}>
              No hay pedidos pendientes
            </div>
          </div>
        ) : pedidos.map((p, idx) => {
          const color = colorPorTiempo(p.created_at)
          const mins = minutosDesde(p.created_at)
          const urgente = mins >= 25
          return (
            <div key={p.id} style={{
              background: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: urgente
                ? `0 0 0 3px ${color}, 0 8px 24px ${color}33`
                : `0 2px 12px rgba(0,0,0,0.08)`,
              display: 'flex', flexDirection: 'column',
            }}>

              {/* Card header */}
              <div style={{
                background: color, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    color: '#fff', fontFamily: DISPLAY, fontSize: 17,
                    textTransform: 'uppercase', letterSpacing: -0.3,
                  }}>
                    {tipoLabel(p)}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 700, marginTop: 1 }}>
                    Ticket #{p.numero}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 20, color: '#fff', letterSpacing: -0.5 }}>
                    {tiempoDesde(p.created_at)}
                  </div>
                  {urgente && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 800, letterSpacing: 1 }}>
                      ⚠ DEMORADO
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div style={{ flex: 1, padding: '14px 16px' }}>
                {(p.items || []).map((item, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{
                      fontSize: 16, fontWeight: 900, color: '#1a1a1a',
                      display: 'flex', alignItems: 'baseline', gap: 6,
                    }}>
                      <span style={{
                        fontFamily: DISPLAY, fontSize: 18, color: color, minWidth: 28,
                      }}>
                        {item.qty}×
                      </span>
                      {item.name}
                    </div>
                    {item.nota && (
                      <div style={{
                        marginTop: 4, paddingLeft: 10,
                        borderLeft: `3px solid ${color}`,
                        fontSize: 13, color: '#444', fontWeight: 700,
                        lineHeight: 1.3,
                      }}>
                        {item.nota}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Botón listo */}
              <div style={{ padding: '0 14px 14px' }}>
                <button
                  onClick={() => marcarListo(p.id)}
                  disabled={marcando === p.id}
                  style={{
                    width: '100%', padding: '15px',
                    background: marcando === p.id ? '#e5e5e5' : '#22c55e',
                    border: 'none', borderRadius: 12,
                    color: marcando === p.id ? '#aaa' : '#fff',
                    fontFamily: FONT, fontWeight: 900, fontSize: 16,
                    cursor: marcando === p.id ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase', letterSpacing: 1,
                    transition: 'background .15s',
                    boxShadow: marcando === p.id ? 'none' : '0 4px 12px rgba(34,197,94,0.4)',
                  }}
                >
                  {marcando === p.id ? 'Marcando...' : '✓  LISTO'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
