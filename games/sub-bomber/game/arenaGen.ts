import { MAP_WIDTH, MAP_HEIGHT, STAGE_ENEMY_BASE, STAGE_ENEMY_PER_STAGE, TileType } from './config.js'

export interface ArenaData {
  map: number[][]
  playerSpawn: { x: number; y: number }
  enemySpawns: { x: number; y: number }[]
  doorPos: { x: number; y: number }
}

export function generateStage(stage: number): ArenaData {
  const map: number[][] = []
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: number[] = []
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (isBorder(x, y) || isPillar(x, y)) {
        row.push(TileType.CONCRETE)
      } else {
        row.push(TileType.FLOOR)
      }
    }
    map.push(row)
  }

  const playerSpawn = { x: 1, y: 1 }

  const safeTiles = new Set<string>()
  const safeZone = [
    [playerSpawn.x, playerSpawn.y],
    [playerSpawn.x + 1, playerSpawn.y],
    [playerSpawn.x, playerSpawn.y + 1],
    [playerSpawn.x + 1, playerSpawn.y + 1],
  ]
  for (const [sx, sy] of safeZone) {
    safeTiles.add(`${sx},${sy}`)
  }

  const enemyCount = STAGE_ENEMY_BASE + (stage - 1) * STAGE_ENEMY_PER_STAGE
  const enemySpawns: { x: number; y: number }[] = []
  const spawnCandidates: { x: number; y: number }[] = []

  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      if (map[y]![x] === TileType.FLOOR && !safeTiles.has(`${x},${y}`) && !(x % 2 === 0 && y % 2 === 0)) {
        spawnCandidates.push({ x, y })
      }
    }
  }

  shuffle(spawnCandidates, stage * 1337 + 42)
  const spawnCount = Math.min(enemyCount, spawnCandidates.length)
  for (let i = 0; i < spawnCount; i++) {
    const c = spawnCandidates[i]
    if (c) enemySpawns.push(c)
  }

  const usedByEnemy = new Set(enemySpawns.map(e => `${e.x},${e.y}`))
  const brickCandidates: { x: number; y: number }[] = []
  for (const c of spawnCandidates) {
    if (!usedByEnemy.has(`${c.x},${c.y}`)) {
      brickCandidates.push(c)
    }
  }

  shuffle(brickCandidates, stage * 777 + 13)
  const brickCount = Math.floor(brickCandidates.length * (0.5 + stage * 0.02))
  const maxBricks = Math.min(brickCount, brickCandidates.length)
  for (let i = 0; i < maxBricks; i++) {
    const b = brickCandidates[i]
    if (b) {
      map[b.y]![b.x] = TileType.BRICK
    }
  }

  const doorCandidates = brickCandidates.filter(b => !usedByEnemy.has(`${b.x},${b.y}`))
  let doorPos: { x: number; y: number }
  if (doorCandidates.length > 0) {
    const last = doorCandidates[doorCandidates.length - 1]
    doorPos = last ? last : { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 }
  } else {
    doorPos = { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 }
  }

  map[doorPos.y]![doorPos.x] = TileType.DOOR

  return { map, playerSpawn, enemySpawns, doorPos }
}

function isBorder(x: number, y: number): boolean {
  return x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1
}

function isPillar(x: number, y: number): boolean {
  return x % 2 === 0 && y % 2 === 0 && !isBorder(x, y)
}

function shuffle<T>(arr: T[], seed: number): void {
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647
    const j = s % (i + 1)
    const tmp = arr[i] as T
    arr[i] = arr[j] as T
    arr[j] = tmp
  }
}
