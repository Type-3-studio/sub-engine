import { Container } from 'pixi.js'

export interface EntityVisual {
  container: Container
  prevX: number
  prevY: number
  curX: number
  curY: number
  first: boolean
}

export interface EntityRendererOptions {
  snapToGrid?: boolean
  gridSize?: number
  interactive?: boolean
}

export interface EntityRenderer {
  sync(entities: Array<{ id: number; Position?: { x: number; y: number }; Label?: { value: string } }>): void
  render(alpha: number): void
  getContainer(id: number): Container | undefined
  onEntityClick(callback: (entityId: number) => void): void
  destroy(): void
}

export function createEntityRenderer(
  entityLayer: Container,
  createVisual: (entity: { id: number } & Record<string, any>) => Container,
  options?: EntityRendererOptions,
): EntityRenderer {
  const entities = new Map<number, EntityVisual>()
  const { snapToGrid = false, gridSize = 64, interactive = false } = options ?? {}
  let clickCallback: ((entityId: number) => void) | null = null

  function toScreen(x: number, y: number): { sx: number; sy: number } {
    if (snapToGrid) {
      return { sx: x * gridSize, sy: y * gridSize }
    }
    return { sx: x, sy: y }
  }

  function sync(entitiesData: Array<{ id: number; Position?: { x: number; y: number }; Label?: { value: string } }>): void {
    const active = new Set<number>()
    for (const e of entitiesData) {
      active.add(e.id)
      let entry = entities.get(e.id)
      if (!entry) {
        const container = createVisual(e)
        ;(container as any).__entityId = e.id
        if (interactive) {
          container.eventMode = 'static'
          container.cursor = 'pointer'
          container.on('pointerdown', () => {
            clickCallback?.(e.id)
          })
        }
        entityLayer.addChild(container)
        entry = {
          container,
          prevX: 0,
          prevY: 0,
          curX: 0,
          curY: 0,
          first: true,
        }
        entities.set(e.id, entry)
      }
      if (e.Position) {
        const { sx, sy } = toScreen(e.Position.x, e.Position.y)
        if (entry.first) {
          entry.prevX = sx
          entry.prevY = sy
          entry.curX = sx
          entry.curY = sy
          entry.first = false
        } else {
          entry.prevX = entry.curX
          entry.prevY = entry.curY
          entry.curX = sx
          entry.curY = sy
        }
      }
    }
    for (const [id, entry] of entities) {
      if (!active.has(id)) {
        entry.container.removeAllListeners()
        entityLayer.removeChild(entry.container)
        entry.container.destroy({ children: true })
        entities.delete(id)
      }
    }
  }

  function render(alpha: number): void {
    for (const [, entry] of entities) {
      entry.container.x = entry.prevX + (entry.curX - entry.prevX) * alpha
      entry.container.y = entry.prevY + (entry.curY - entry.prevY) * alpha
    }
  }

  function getContainer(id: number): Container | undefined {
    return entities.get(id)?.container
  }

  function onEntityClick(callback: (entityId: number) => void): void {
    clickCallback = callback
  }

  function destroy(): void {
    for (const [, entry] of entities) {
      entry.container.removeAllListeners()
      entityLayer.removeChild(entry.container)
      entry.container.destroy({ children: true })
    }
    entities.clear()
    clickCallback = null
  }

  return { sync, render, getContainer, onEntityClick, destroy }
}
