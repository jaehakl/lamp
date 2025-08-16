import { applyEffects } from '@nori/core-rules'

// 간단 이벤트 버스
function createBus() {
  const map = new Map()
  return {
    on(type, fn) { (map.get(type) || map.set(type, []).get(type)).push(fn) },
    off(type, fn) { 
      const listeners = map.get(type)
      if (listeners) {
        const index = listeners.indexOf(fn)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    },
    emit(type, payload) { (map.get(type) || []).forEach(fn => fn(payload)) }
  }
}

// 시드 RNG (문자열 시드 → 32비트 → mulberry32)
function xmur3(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createKernel(seed, modules) {
  const seedHash = xmur3(String(seed))()
  const randFn = mulberry32(seedHash)
  const rand = {
    float: () => randFn(),
    int: (n) => Math.floor(randFn() * n),
    roll: (p) => randFn() < p
  }

  const bus = createBus()
  const state = { flags: {}, resources: {} }
  const log = []

  const ctx = { rand, bus, state, log }

  // 모듈 인스턴스 준비
  const mods = modules.map(m => (typeof m === 'function' ? m() : m))
  for (const m of mods) {
    if (typeof m.init === 'function') m.init(ctx)
  }

  const kernel = {
    ctx,
    modules: mods,
    dispatch(modId, action, payload) {
      const mod = mods.find(m => m.id === modId)
      if (!mod || !mod.actions || !mod.actions[action]) return
      const effects = mod.actions[action](payload, ctx) || []
      applyEffects(effects, ctx)
      bus.emit('effects.applied', effects)
      return effects
    },
    save() { return { v: 1, seed, state } },
    load(s) { if (s && s.state) Object.assign(state, s.state) },
  }
  return kernel
}
