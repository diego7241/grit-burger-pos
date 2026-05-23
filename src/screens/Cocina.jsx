import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

function beep(ctx, freq, duracion, offset = 0) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, ctx.currentTime + offset)
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + offset + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + duracion)
  osc.start(ctx.currentTime + offset)
  osc.stop(ctx.currentTime + offset + duracion + 0.05)
}

// 3 tonos ascendentes — pedido nuevo
function sonarNuevo(ctx) {
  beep(ctx, 880,  0.14, 0)
  beep(ctx, 1100, 0.14, 0.18)
  beep(ctx, 1320, 0.20, 0.36)
}

// 2 tonos cortos — pedido modificado
function sonarModificado(ctx) {
  beep(ctx, 660, 0.10, 0)
  beep(ctx, 880, 0.10, 0.14)
}

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
  const [actualizados, setActualizados] = useState({})
  const [audioActivo, setAudioActivo] = useState(false)
  const audioCtxRef = useRef(null)

  const activarAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    setAudioActivo(true)
    // Tono de confirmación al activar
    sonarNuevo(audioCtxRef.current)
  }

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, (payload) => {
        cargar()
        if (payload.new?.estado === 'confirmado' && audioCtxRef.current) {
          sonarNuevo(audioCtxRef.current)
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pedidos' }, cargar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        cargar()
        if (payload.new && payload.new.listo === false && payload.new.estado === 'confirmado') {
          setActualizados(prev => ({ ...prev, [payload.new.id]: Date.now() }))
          if (audioCtxRef.current) sonarModificado(audioCtxRef.current)
        }
      })
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

      {/* Overlay activar sonido — desaparece al tocar */}
      {!audioActivo && (
        <div
          onClick={activarAudio}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 20 }}>🔔</div>
          <div style={{
            fontFamily: DISPLAY, fontSize: 28, color: '#fff',
            textTransform: 'uppercase', letterSpacing: -0.5, marginBottom: 10,
          }}>Activar sonido</div>
          <div style={{ fontSize: 14, color: '#888', fontWeight: 600 }}>
            Tocar para recibir alertas de nuevos pedidos
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: '#111', padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.jpg" alt="Grit Burger" style={{ height: 30, borderRadius: 6 }} />
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
          const fueActualizado = actualizados[p.id] && (Date.now() - actualizados[p.id]) < 180000
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

              {/* Badge actualizado */}
              {fueActualizado && (
                <div style={{
                  background: '#f59e0b', padding: '5px 16px',
                  color: '#fff', fontSize: 11, fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center',
                }}>
                  ⚡ Pedido actualizado — revisar
                </div>
              )}

              {/* Items — los complementos no se muestran solos, ya están en la nota del plato */}
              <div style={{ flex: 1, padding: '14px 16px' }}>
                {(p.items || []).filter(item => !item.isComplemento).map((item, i) => (
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
