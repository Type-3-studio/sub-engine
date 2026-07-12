import type { GameMap, FlowField, Vec2 } from './types.js'



const DIRS_4: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]
const DIRS_8: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]

function isWalkable(map: GameMap, x: number, y: number): boolean {
  return x >= 0 && x < map.width && y >= 0 && y < map.height && map.isWalkable(x, y)
}

export function computeFlowField(map: GameMap, targetX: number, targetY: number): FlowField {
  if (!map.isWalkable(targetX, targetY)) {
    throw new Error(`Target cell (${targetX}, ${targetY}) is not walkable`)
  }

  const { width, height } = map

  const cost: number[][] = Array.from({ length: height }, () => Array(width).fill(Infinity))
  const vectors: (Vec2 | null)[][] = Array.from({ length: height }, () => Array(width).fill(null))

  cost[targetY]![targetX] = 0
  const queue: [number, number][] = [[targetX, targetY]]
  let readIdx = 0

  while (readIdx < queue.length) {
    const [cx, cy] = queue[readIdx++]!
    const currentCost = cost[cy]![cx]!

    for (const [dx, dy] of DIRS_4) {
      const nx = cx + dx
      const ny = cy + dy
      if (!isWalkable(map, nx, ny)) continue
      if (currentCost + 1 < cost[ny]![nx]!) {
        cost[ny]![nx] = currentCost + 1
        queue.push([nx, ny])
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!map.isWalkable(x, y) || cost[y]![x] === Infinity) {
        vectors[y]![x] = { x: 0, y: 0 }
        continue
      }
      if (cost[y]![x] === 0) {
        vectors[y]![x] = { x: 0, y: 0 }
        continue
      }

      let minCost = Infinity
      let bestDx = 0
      let bestDy = 0

      for (const [dx, dy] of DIRS_8) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        if (!map.isWalkable(nx, ny)) continue
        if (cost[ny]![nx]! < minCost) {
          minCost = cost[ny]![nx]!
          bestDx = dx
          bestDy = dy
        }
      }

      const len = Math.sqrt(bestDx * bestDx + bestDy * bestDy)
      vectors[y]![x] = len > 0
        ? { x: bestDx / len, y: bestDy / len }
        : { x: 0, y: 0 }
    }
  }

  function getVector(x: number, y: number): Vec2 {
    if (x < 0 || x >= width || y < 0 || y >= height) return { x: 0, y: 0 }
    return vectors[y]![x]!
  }

  function getCostValue(x: number, y: number): number {
    if (x < 0 || x >= width || y < 0 || y >= height) return Infinity
    return cost[y]![x]!
  }

  return {
    width,
    height,
    getVector,
    getCost: getCostValue,
    serialize() {
      return vectors.map(row => row.map(v => ({ x: v!.x, y: v!.y })))
    },
  }
}
