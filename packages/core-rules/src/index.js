// 공통 공식 + 이펙트 적용기
export const F = {
  clamp(min, x, max) { return Math.max(min, Math.min(max, x)); },
  hitChance({ acc = 50, eva = 50, cover = 0, height = 0 } = {}) {
    const base = 0.65 + 0.01 * (acc - eva) - 0.15 * cover + 0.05 * height;
    return Math.max(0.05, Math.min(0.95, base));
  }
}

export function applyEffects(effects, ctx) {
  if (!effects) return;
  for (const e of effects) {
    switch (e.type) {
      case 'resource.add': {
        const k = e.k; const v = e.v || 0;
        if (!ctx.state.resources) ctx.state.resources = {};
        ctx.state.resources[k] = (ctx.state.resources[k] || 0) + v;
        log(ctx, `+${v} ${k}`);
        break;
      }
      case 'flag.set': {
        ctx.state.flags[e.key] = e.v;
        break;
      }
      case 'hp.damage': {
        log(ctx, `Damage ${e.amount} -> ${e.target}`);
        break;
      }
      case 'log': {
        log(ctx, e.msg, e.meta);
        break;
      }
      default: console.warn('Unknown effect', e);
    }
  }
}

function log(ctx, msg, meta) {
  ctx.log.push({ t: Date.now(), msg, meta });
}
