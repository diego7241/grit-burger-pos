import { supabase } from './supabase'
import { MENU } from './menu'

export const CATEGORY_META = {
  promociones:  { label: 'Promos',       emoji: '🔥' },
  hamburguesas: { label: 'Hamburguesas', emoji: '🍔' },
  alitas:       { label: 'Alitas',       emoji: '🍗' },
  salchipapas:  { label: 'Salchipapas', emoji: '🌭' },
  bebidas:      { label: 'Bebidas',      emoji: '🥤' },
  complementos: { label: 'Extras',       emoji: '➕' },
}

let _cache = null
let _cacheAt = 0

export function invalidarMenuCache() {
  _cache = null
}

export async function fetchMenu() {
  if (_cache && Date.now() - _cacheAt < 60_000) return _cache

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('orden')

  if (error || !data?.length) {
    _cache = { menu: MENU, categorias: Object.keys(MENU) }
    _cacheAt = Date.now()
    return _cache
  }

  const menu = {}
  data.forEach(item => {
    if (!menu[item.categoria]) {
      const meta = CATEGORY_META[item.categoria] || { label: item.categoria, emoji: '•' }
      menu[item.categoria] = { ...meta, items: [] }
    }
    if (item.disponible) {
      menu[item.categoria].items.push({
        id: item.id,
        name: item.name,
        desc: item.descripcion || '',
        price: Number(item.price),
      })
    }
  })

  Object.keys(menu).forEach(k => {
    if (!menu[k].items.length) delete menu[k]
  })

  _cache = { menu, categorias: Object.keys(menu) }
  _cacheAt = Date.now()
  return _cache
}

export async function getConfig(key) {
  const { data } = await supabase.from('config').select('value').eq('key', key).single()
  return data?.value ?? null
}

export async function setConfig(key, value) {
  const { error } = await supabase.from('config').upsert({ key, value: String(value) })
  return !error
}
