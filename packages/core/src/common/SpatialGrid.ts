import type { AABB } from './systems/CollisionSystem.js'

export interface SpatialEntry {
  id: number
  aabb: AABB
}

export class SpatialGrid {
  private cellSize: number
  private cols: number
  private rows: number
  private cells: Map<number, SpatialEntry[]>

  constructor(cellSize: number, worldWidth: number, worldHeight: number) {
    this.cellSize = cellSize
    this.cols = Math.ceil(worldWidth / cellSize)
    this.rows = Math.ceil(worldHeight / cellSize)
    this.cells = new Map()
  }

  clear(): void {
    this.cells.clear()
  }

  insert(id: number, aabb: AABB): void {
    const minCol = Math.max(0, Math.floor(aabb.left / this.cellSize))
    const maxCol = Math.min(this.cols - 1, Math.floor((aabb.right - 1) / this.cellSize))
    const minRow = Math.max(0, Math.floor(aabb.top / this.cellSize))
    const maxRow = Math.min(this.rows - 1, Math.floor((aabb.bottom - 1) / this.cellSize))

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const key = r * this.cols + c
        let cell = this.cells.get(key)
        if (!cell) {
          cell = []
          this.cells.set(key, cell)
        }
        cell.push({ id, aabb })
      }
    }
  }

  getNearby(x: number, y: number, range: number): SpatialEntry[] {
    const result: SpatialEntry[] = []
    const seen = new Set<number>()
    const minCol = Math.max(0, Math.floor((x - range) / this.cellSize))
    const maxCol = Math.min(this.cols - 1, Math.floor((x + range) / this.cellSize))
    const minRow = Math.max(0, Math.floor((y - range) / this.cellSize))
    const maxRow = Math.min(this.rows - 1, Math.floor((y + range) / this.cellSize))

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = this.cells.get(r * this.cols + c)
        if (!cell) continue
        for (const entry of cell) {
          if (!seen.has(entry.id)) {
            seen.add(entry.id)
            const dx = x - (entry.aabb.left + entry.aabb.right) / 2
            const dy = y - (entry.aabb.top + entry.aabb.bottom) / 2
            if (dx * dx + dy * dy <= range * range) {
              result.push(entry)
            }
          }
        }
      }
    }

    return result
  }

  getNearbyAABB(aabb: AABB): SpatialEntry[] {
    const result: SpatialEntry[] = []
    const seen = new Set<number>()
    const minCol = Math.max(0, Math.floor(aabb.left / this.cellSize))
    const maxCol = Math.min(this.cols - 1, Math.floor((aabb.right - 1) / this.cellSize))
    const minRow = Math.max(0, Math.floor(aabb.top / this.cellSize))
    const maxRow = Math.min(this.rows - 1, Math.floor((aabb.bottom - 1) / this.cellSize))

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = this.cells.get(r * this.cols + c)
        if (!cell) continue
        for (const entry of cell) {
          if (!seen.has(entry.id)) {
            seen.add(entry.id)
            result.push(entry)
          }
        }
      }
    }

    return result
  }
}
