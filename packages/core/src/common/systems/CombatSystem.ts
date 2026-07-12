import type { Registry } from '../../engine/types.js'

export function combatSystem(registry: Registry, dt: number): Registry {
  const attackers = registry.getEntitiesWith(['TargetScanner', 'Position'])
  for (const { id, TargetScanner, Position } of attackers) {
    const scanner = TargetScanner as { range: number; targetEntity?: number; damage?: number; fireRate?: number; cooldownRemaining?: number }
    const targetId = scanner.targetEntity
    if (!targetId || !registry.entityExists(targetId)) continue
    if (!registry.hasComponent(targetId, 'Health')) continue
    if (!registry.hasComponent(targetId, 'Position')) continue

    const targetPos = registry.getComponent(targetId, 'Position') as { x: number; y: number } | undefined
    if (!targetPos) continue

    const pos = Position as { x: number; y: number }
    const dx = pos.x - targetPos.x
    const dy = pos.y - targetPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= scanner.range) {
      const cooldownRemaining = scanner.cooldownRemaining ?? 0
      if (cooldownRemaining > 0) {
        registry.addComponent(id, 'TargetScanner', {
          ...scanner,
          cooldownRemaining: Math.max(0, cooldownRemaining - dt),
        })
        continue
      }

      const hp = registry.getComponent(targetId, 'Health') as { current: number; max: number } | undefined
      if (!hp) continue
      const damage = scanner.damage ?? 10
      registry.addComponent(targetId, 'Health', {
        current: Math.max(0, hp.current - damage),
        max: hp.max,
      })

      if (scanner.fireRate !== undefined && scanner.fireRate > 0) {
        registry.addComponent(id, 'TargetScanner', {
          ...scanner,
          cooldownRemaining: scanner.fireRate,
        })
      }
    }
  }
  return registry
}
