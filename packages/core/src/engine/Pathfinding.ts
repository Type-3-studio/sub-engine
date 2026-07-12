import type { GameMap, Vec2 } from './types.js'

export interface PathResult {
  path: Vec2[]
  steps: number
  success: boolean
}

interface AStarNode {
  x: number
  y: number
  g: number
  f: number
  parent: AStarNode | null
}

function heuristic(ax: number, ay: number, bx: number, by: number, diagonal: boolean): number {
  const dx = Math.abs(ax - bx)
  const dy = Math.abs(ay - by)
  return diagonal ? Math.sqrt(dx * dx + dy * dy) : dx + dy
}

function key(x: number, y: number): string {
  return `${x},${y}`
}

function reconstructPath(node: AStarNode): Vec2[] {
  const path: Vec2[] = []
  let current: AStarNode | null = node
  while (current) {
    path.unshift({ x: current.x, y: current.y })
    current = current.parent
  }
  return path
}

export function aStar(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  allowDiagonal = false,
): PathResult {
  if (!map.isWalkable(startX, startY)) {
    throw new Error(`Start cell (${startX}, ${startY}) is not walkable`)
  }
  if (!map.isWalkable(goalX, goalY)) {
    throw new Error(`Goal cell (${goalX}, ${goalY}) is not walkable`)
  }

  if (startX === goalX && startY === goalY) {
    return { path: [{ x: startX, y: startY }], steps: 0, success: true }
  }

  const dirs: [number, number][] = allowDiagonal
    ? [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]
    : [[0, -1], [0, 1], [-1, 0], [1, 0]]

  const diagCost = allowDiagonal ? Math.SQRT2 : 0

  const open: AStarNode[] = []
  const closed = new Set<string>()
  const openMap = new Map<string, AStarNode>()

  const startNode: AStarNode = {
    x: startX, y: startY,
    g: 0,
    f: heuristic(startX, startY, goalX, goalY, allowDiagonal),
    parent: null,
  }
  open.push(startNode)
  openMap.set(key(startX, startY), startNode)
  let steps = 0

  while (open.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i]!.f < open[bestIdx]!.f) bestIdx = i
    }
    const current = open[bestIdx]!
    steps++

    if (current.x === goalX && current.y === goalY) {
      return { path: reconstructPath(current), steps, success: true }
    }

    open.splice(bestIdx, 1)
    openMap.delete(key(current.x, current.y))
    closed.add(key(current.x, current.y))

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx
      const ny = current.y + dy
      const k = key(nx, ny)

      if (!map.isWalkable(nx, ny)) continue
      if (closed.has(k)) continue

      const isDiagonal = dx !== 0 && dy !== 0
      const moveCost = isDiagonal ? diagCost : 1

      const tentativeG = current.g + moveCost
      const existing = openMap.get(k)

      if (existing) {
        if (tentativeG < existing.g) {
          existing.g = tentativeG
          existing.f = tentativeG + heuristic(nx, ny, goalX, goalY, allowDiagonal)
          existing.parent = current
        }
      } else {
        const node: AStarNode = {
          x: nx, y: ny,
          g: tentativeG,
          f: tentativeG + heuristic(nx, ny, goalX, goalY, allowDiagonal),
          parent: current,
        }
        open.push(node)
        openMap.set(k, node)
      }
    }
  }

  return { path: [], steps, success: false }
}
