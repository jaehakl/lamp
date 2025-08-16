// 간단 내러티브 모듈: 노드/선택지/플래그/이펙트
export function createNarrative(opts = {}) {
  const nodes = opts.nodes || {}
  const startId = opts.start || Object.keys(nodes)[0]

  let local = { nodeId: startId }

  return {
    id: 'narrative',
    init(ctx) {
      // 전역 state 아래 보관(읽기 쉬움)
      if (!ctx.state.narrative) ctx.state.narrative = {}
      Object.assign(ctx.state.narrative, local)
    },
    actions: {
      start(_, ctx) {
        local.nodeId = startId
        ctx.state.narrative.nodeId = startId
        return [{ type: 'log', msg: '모험을 시작한다.' }]
      },
      choose({ index }, ctx) {
        const node = nodes[local.nodeId]
        const choice = node?.choices?.[index]
        if (!choice) return []

        // 조건(req)이 있으면 검사 (flag true/false)
        if (choice.req) {
          const want = choice.req.v !== undefined ? choice.req.v : true
          if ((ctx.state.flags[choice.req.key] || false) !== want) {
            return [{ type: 'log', msg: '그 선택은 지금은 할 수 없다.' }]
          }
        }

        const effects = []
        // 선택시 이펙트 적용
        if (Array.isArray(choice.effects)) effects.push(...choice.effects)
        if (choice.set) {
          for (const [k, v] of Object.entries(choice.set)) {
            effects.push({ type: 'flag.set', key: k, v })
          }
        }

        // 다음 노드로 이동
        if (choice.goto) {
          local.nodeId = choice.goto
          ctx.state.narrative.nodeId = choice.goto
        }

        // 현재 노드 로그 남기기(옵션)
        if (choice.text) effects.push({ type: 'log', msg: `▶ ${choice.text}` })

        return effects
      }
    }
  }
}
