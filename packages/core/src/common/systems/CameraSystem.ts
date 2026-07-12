import type { Registry } from '../../engine/types.js'

export interface CameraDef {
  x: number
  y: number
  width: number
  height: number
  zoom: number
  targetEntity?: number
  minX?: number
  minY?: number
  maxX?: number
  maxY?: number
}

export function cameraSystem(registry: Registry, dt: number): Registry {
  const cameras = registry.getEntitiesWith(['Camera'])
  for (const { id, Camera } of cameras) {
    const cam = Camera as CameraDef
    let x = cam.x
    let y = cam.y

    if (cam.targetEntity !== undefined && registry.entityExists(cam.targetEntity)) {
      const targetPos = registry.getComponent(cam.targetEntity, 'Position')
      if (targetPos) {
        const tp = targetPos as { x: number; y: number }
        x = tp.x - cam.width / 2
        y = tp.y - cam.height / 2
      }
    }

    if (cam.minX !== undefined) x = Math.max(x, cam.minX)
    if (cam.minY !== undefined) y = Math.max(y, cam.minY)
    if (cam.maxX !== undefined) x = Math.min(x, cam.maxX - cam.width)
    if (cam.maxY !== undefined) y = Math.min(y, cam.maxY - cam.height)

    registry.addComponent(id, 'Camera', { ...cam, x, y })
  }
  return registry
}
