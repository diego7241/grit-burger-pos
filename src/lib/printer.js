// Web Bluetooth ESC/POS — 58mm thermal printer
import { QR_GMAPS_BMP } from './qr-gmaps.js'

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

async function buscarChar(server) {
  for (const svcUUID of SERVICES) {
    try {
      const svc = await server.getPrimaryService(svcUUID)
      for (const charUUID of CHARS) {
        try {
          const c = await svc.getCharacteristic(charUUID)
          if (c.properties.write || c.properties.writeWithoutResponse) return c
        } catch (_) {}
      }
      try {
        const chars = await svc.getCharacteristics()
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) return c
        }
      } catch (_) {}
    } catch (_) {}
  }
  return null
}

export async function conectarImpresora() {
  // Intentar reconectar dispositivos ya autorizados (sin mostrar el picker)
  try {
    const devices = await navigator.bluetooth.getDevices()
    for (const d of devices) {
      try {
        const server = await d.gatt.connect()
        const c = await buscarChar(server)
        if (c) { _char = c; return d.name || 'Impresora' }
      } catch (_) {}
    }
  } catch (_) {}

  // Mostrar picker si no hay dispositivo autorizado
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICES,
  })
  const server = await device.gatt.connect()
  const c = await buscarChar(server)
  if (c) { _char = c; return device.name || 'Impresora' }
  throw new Error('No se encontró el servicio. Verifica que la impresora esté encendida.')
}

async function enviar(data) {
  if (!_char) throw new Error('Sin conexión a impresora')
  const CHUNK = 20
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    try {
      if (_char.properties.write) {
        await _char.writeValue(chunk)  // ACK hace control de flujo, sin delay extra
      } else {
        await _char.writeValueWithoutResponse(chunk)
        await new Promise(r => setTimeout(r, 20))
      }
    } catch (e) {
      _char = null
      throw new Error('Error enviando datos: ' + e.message)
    }
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
const ANCHO = 32

// Elimina acentos y caracteres especiales que la impresora no entiende
function norm(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // quitar diacríticos
    .replace(/[^\x00-\x7F]/g, '?')   // reemplazar resto no-ASCII
}
const t = s => enc.encode(norm(s))

async function bytesLogo() {
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.crossOrigin = 'anonymous'
      i.onload = () => res(i)
      i.onerror = rej
      i.src = '/logo.jpg'
    })
    const W = 200, scale = W / img.width
    const H = Math.round(img.height * scale)
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(img, 0, 0, W, H)
    const px = ctx.getImageData(0, 0, W, H).data
    const wBytes = Math.ceil(W / 8)
    const bmp = new Uint8Array(wBytes * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4
        const gray = px[i] * 0.299 + px[i+1] * 0.587 + px[i+2] * 0.114
        // Invertir: logo negro sobre blanco → imprime el texto/mascota
        if (gray < 200) bmp[y * wBytes + Math.floor(x / 8)] |= (1 << (7 - x % 8))
      }
    }
    const xL = wBytes & 0xFF, xH = (wBytes >> 8) & 0xFF
    const yL = H & 0xFF, yH = (H >> 8) & 0xFF
    return unir(new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]), bmp)
  } catch (_) { return null }
}

function fila(izq, der) {
  const d = String(der)
  const i = String(izq).substring(0, ANCHO - d.length - 1)
  return i + ' '.repeat(Math.max(1, ANCHO - i.length - d.length)) + d
}

export async function pruebaImprimir() {
  if (!_char) throw new Error('Impresora no conectada')
  // Solo texto plano, sin ningún comando ESC/POS
  const texto = 'GRIT BURGER\nPRUEBA DE IMPRESION\n1x Clasica  S/13.00\nTOTAL       S/13.00\n\n\n\n'
  await enviar(new TextEncoder().encode(texto))
}

export async function imprimirTicket(pedido, numero) {
  if (!_char) throw new Error('Impresora no conectada')

  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const fecha = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
  const tipoLabel = pedido.tipo === 'mesa' ? `Mesa ${pedido.mesa}` :
    pedido.tipo === 'llevar' ? (pedido.cliente ? `Llevar: ${pedido.cliente}` : 'Para llevar') :
    (pedido.cliente ? `WA: ${pedido.cliente}` : 'WhatsApp')

  const esLlevarWA = pedido.tipo === 'llevar' || pedido.tipo === 'whatsapp'
  const logo = await bytesLogo()

  const partes = [
    b(0x1B, 0x40),                        // init
    b(0x1B, 0x37, 0x09, 0xBF, 0x03),     // densidad máxima
    b(0x1B, 0x61, 0x01),                  // centro
  ]

  if (logo) {
    partes.push(logo, t('\n'))
  } else {
    partes.push(
      b(0x1D, 0x21, 0x11), b(0x1B, 0x45, 0x01),
      t('GRIT BURGER\n'),
      b(0x1D, 0x21, 0x00), b(0x1B, 0x45, 0x00),
    )
  }

  partes.push(
    t(`Ticket #${numero}\n`),
    t('-'.repeat(ANCHO) + '\n'),
  )

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
    t('\nGracias por tu visita!\ngritburguer.vercel.app\n'),
    t('-'.repeat(ANCHO) + '\n'),
    t('Te gusto? Dejanos tu resena!\n'),
    QR_GMAPS_BMP,
    t('\n* Google Maps *\n'),
    t('- '.repeat(ANCHO / 2) + '\n\n\n'),
    b(0x1D, 0x56, 0x42, 0x00),            // cortar papel
  )

  await enviar(unir(...partes))
}
