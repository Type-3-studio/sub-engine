import type { Registry } from '../../engine/types.js'

export type PathFollowerComponents = {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'PathFollower': { path: Array<{ x: number; y: number }>; index: number; speed: number; loop?: boolean }
}

const SNAP_DIST = 0.5

export function pathfindingSystem(
  registry: Registry<PathFollowerComponents>,
  dt: number,
): Registry<PathFollowerComponents> {
  const stepScale = dt / 16
  const entities = registry.getEntitiesWith(['Position', 'Velocity', 'PathFollower'])
  for (const e of entities) {
    const pos = e.Position
    const pf = e.PathFollower

    if (pf.index >= pf.path.length) {
      if (pf.loop) {
        const first = pf.path[0]
        if (!first) continue
        const dx = first.x - pos.x
        const dy = first.y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < SNAP_DIST) {
          registry.addComponent(e.id, 'Position', { x: first.x, y: first.y })
          registry.addComponent(e.id, 'PathFollower', { ...pf, index: 1 })
        } else {
          const scale = Math.min(pf.speed * stepScale / dist, 1)
          registry.addComponent(e.id, 'Velocity', {
            x: dx * scale,
            y: dy * scale,
          })
        }
      } else {
        registry.addComponent(e.id, 'Velocity', { x: 0, y: 0 })
      }
      continue
    }

    const target = pf.path[pf.index]!
    const dx = target.x - pos.x
    const dy = target.y - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < SNAP_DIST) {
      registry.addComponent(e.id, 'Position', { x: target.x, y: target.y })
      registry.addComponent(e.id, 'PathFollower', { ...pf, index: pf.index + 1 })
      if (pf.index + 1 >= pf.path.length && !pf.loop) {
        registry.addComponent(e.id, 'Velocity', { x: 0, y: 0 })
      }
      continue
    }

    const scale = Math.min(pf.speed * stepScale / dist, 1)
    registry.addComponent(e.id, 'Velocity', {
      x: dx * scale,
      y: dy * scale,
    })
  }
  return registry
}
