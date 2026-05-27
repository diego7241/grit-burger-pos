// Web Bluetooth ESC/POS — 58mm thermal printer

const SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '00001101-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
]
const CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '00002af0-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb',
]

let _char = null

export const bluetoothDisponible = () => !!navigator.bluetooth

export async function conectarImpresora() {
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICES,
  })
  const server = await device.gatt.connect()

  // Intentar cada combinación de servicio + característica
  for (const svcUUID of SERVICES) {
    try {
      const svc = await server.getPrimaryService(svcUUID)
      // Primero intentar características conocidas
      for (const charUUID of CHARS) {
        try {
          const c = await svc.getCharacteristic(charUUID)
          if (c.properties.writeWithoutResponse || c.properties.write) {
            _char = c
            return device.name || 'Impresora'
          }
        } catch (_) {}
      }
      // Si no, buscar cualquier característica escribible en este servicio
      try {
        const chars = await svc.getCharacteristics()
        for (const c of chars) {
          if (c.properties.writeWithoutResponse || c.properties.write) {
            _char = c
            return device.name || 'Impresora'
          }
        }
      } catch (_) {}
    } catch (_) {}
  }
  throw new Error('No se encontró el servicio. Verifica que la impresora esté encendida.')
}

async function enviar(data) {
  if (!_char) throw new Error('Sin conexión a impresora')
  const CHUNK = 20
  const usarSinRespuesta = _char.properties.writeWithoutResponse
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    try {
      if (usarSinRespuesta) {
        await _char.writeValueWithoutResponse(chunk)
      } else {
        await _char.writeValue(chunk)
      }
    } catch (e) {
      _char = null
      throw new Error('Error enviando datos: ' + e.message)
    }
    await new Promise(r => setTimeout(r, 50))
  }
}

function unir(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) { out.set(a, off); off += a.length }
  return out
}

const enc = new TextEncoder()
const b = (...xs) => new Uint8Array(xs)
const t = s => enc.encode(s)
const ANCHO = 32

function fila(izq, der) {
  const d = String(der)
  const i = String(izq).substring(0, ANCHO - d.length - 1)
  return i + ' '.repeat(Math.max(1, ANCHO - i.length - d.length)) + d
}

export async function imprimirTicket(pedido, numero) {
  if (!_char) throw new Error('Impresora no conectada')

  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const fecha = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
  const tipoLabel = pedido.tipo === 'mesa' ? `Mesa ${pedido.mesa}` :
    pedido.tipo === 'llevar' ? (pedido.cliente ? `Llevar: ${pedido.cliente}` : 'Para llevar') :
    (pedido.cliente ? `WA: ${pedido.cliente}` : 'WhatsApp')

  const esLlevarWA = pedido.tipo === 'llevar' || pedido.tipo === 'whatsapp'

  const partes = [
    b(0x1B, 0x40),                        // init
    b(0x1B, 0x61, 0x01),                  // centro
    b(0x1D, 0x21, 0x11), b(0x1B, 0x45, 0x01),
    t('GRIT BURGER\n'),
    b(0x1D, 0x21, 0x00), b(0x1B, 0x45, 0x00),
    t(`Ticket #${numero}\n`),
    t('-'.repeat(ANCHO) + '\n'),
  ]

  // Nombre cliente destacado para llevar/WA
  if (esLlevarWA && pedido.cliente) {
    partes.push(
      b(0x1B, 0x45, 0x01), b(0x1D, 0x21, 0x01),
      t(`** ${pedido.cliente.toUpperCase()} **\n`),
      b(0x1D, 0x21, 0x00), b(0x1B, 0x45, 0x00),
    )
  }

  partes.push(
    b(0x1B, 0x61, 0x00),                  // izquierda
    b(0x1B, 0x45, 0x01), t(`${tipoLabel}\n`), b(0x1B, 0x45, 0x00),
    t(`${fecha}  ${hora}\n`),
    t('-'.repeat(ANCHO) + '\n'),
  )

  const items = (pedido.items || []).filter(i => !i.isComplemento)
  for (const item of items) {
    const compKids = (pedido.items || []).filter(x => x.isComplemento && x.parentLineId === item.lineId)
    const notaLimpia = compKids.reduce(
      (n, c) => n.replace(new RegExp(`,?\\s*${c.name}`, 'i'), '').replace(/^,\s*/, '').trim(),
      item.nota || ''
    )
    partes.push(
      b(0x1B, 0x45, 0x01),
      t(fila(`${item.qty}x ${item.name}`, `S/${(item.price * item.qty).toFixed(2)}`) + '\n'),
      b(0x1B, 0x45, 0x00),
    )
    if (notaLimpia) partes.push(t(`  > ${notaLimpia}\n`))
    for (const comp of compKids) {
      partes.push(t(fila(`  + ${comp.name}`, `S/${(comp.price * comp.qty).toFixed(2)}`) + '\n'))
    }
  }

  partes.push(
    t('-'.repeat(ANCHO) + '\n'),
    b(0x1B, 0x45, 0x01), b(0x1D, 0x21, 0x01),
    t(fila('TOTAL', `S/${Number(pedido.total).toFixed(2)}`) + '\n'),
    b(0x1D, 0x21, 0x00), b(0x1B, 0x45, 0x00),
  )

  if (pedido.metodo_pago) {
    partes.push(
      b(0x1B, 0x61, 0x01),
      t(`Pago: ${pedido.metodo_pago.toUpperCase()}\n`),
      b(0x1B, 0x61, 0x00),
    )
  }

  partes.push(
    b(0x1B, 0x61, 0x01),
    t('\nGracias por tu visita!\ngritburger.pe\n'),
    t('- '.repeat(ANCHO / 2) + '\n\n\n'),
    b(0x1D, 0x56, 0x42, 0x00),            // cortar papel
  )

  await enviar(unir(...partes))
}
