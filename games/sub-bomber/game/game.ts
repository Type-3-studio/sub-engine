import { createRegistry, createEntity } from '@sub-engine/core'
import type { Registry, Entity } from '@sub-engine/core'
import { SCHEMA, type BomberComponents } from './contract.js'
import {
  MAP_WIDTH, MAP_HEIGHT,
  PLAYER_DEFAULT_BOMBS, PLAYER_DEFAULT_RADIUS, PLAYER_DEFAULT_MOVE_INTERVAL,
  PLAYER_DEFAULT_LIVES, PLAYER_INVULN_DURATION,
  BOMB_FUSE_DURATION, BOMB_COOLDOWN, EXPLOSION_DURATION, EXPLOSION_DAMAGE,
  ENEMY_MOVE_INTERVAL, ENEMY_DIR_CHANGE_INTERVAL,
  POWERUP_CHANCE, TileType,
} from './config.js'
import { generateStage } from './arenaGen.js'

export type TileMap = number[][]

export class BomberGame {
  registry: Registry<BomberComponents>
  map: TileMap
  stage: number
  score: number
  phase: 'playing' | 'won' | 'lost' | 'gameover' | 'paused'
  playerId: number
  doorId: number
  doorPos: { x: number; y: number }
  exitRevealed: boolean
  inputState: { dx: number; dy: number; wantBomb: boolean }

  private _bombCount = 0

  constructor() {
    this.registry = createRegistry<BomberComponents>()
    this.map = []
    this.stage = 1
    this.score = 0
    this.phase = 'playing'
    this.playerId = 0
    this.doorId = 0
    this.doorPos = { x: 0, y: 0 }
    this.exitRevealed = false
    this.inputState = { dx: 0, dy: 0, wantBomb: false }
    this.initStage(1)
  }

  initStage(stage: number): void {
    this.registry.clear()
    this.stage = stage
    this.phase = 'playing'
    this.exitRevealed = false
    this._bombCount = 0

    const arena = generateStage(stage)
    this.map = arena.map
    this.doorPos = arena.doorPos

    this.playerId = createEntity(this.registry, {
      [SCHEMA.GRID_POSITION]: { x: arena.playerSpawn.x, y: arena.playerSpawn.y },
      [SCHEMA.PLAYER]: {
        bombCount: PLAYER_DEFAULT_BOMBS,
        bombRadius: PLAYER_DEFAULT_RADIUS,
        moveInterval: PLAYER_DEFAULT_MOVE_INTERVAL,
        alive: true,
        lives: PLAYER_DEFAULT_LIVES,
        invulnTimer: 0,
        bombCooldown: 0,
      },
      [SCHEMA.MOVE_COOLDOWN]: { remaining: 0 },
    })

    this.doorId = createEntity(this.registry, {
      [SCHEMA.GRID_POSITION]: { x: arena.doorPos.x, y: arena.doorPos.y },
      [SCHEMA.DOOR]: { open: false },
    })

    for (const spawn of arena.enemySpawns) {
      const dir = randomDir()
      createEntity(this.registry, {
        [SCHEMA.GRID_POSITION]: { x: spawn.x, y: spawn.y },
        [SCHEMA.ENEMY]: { alive: true, moveTimer: 0, dirX: dir.x, dirY: dir.y },
        [SCHEMA.MOVE_COOLDOWN]: { remaining: Math.random() * ENEMY_MOVE_INTERVAL },
      })
    }
  }

  getSnapshot(): Entity<BomberComponents>[] {
    return this.registry.getAllEntitiesReadonly() as Entity<BomberComponents>[]
  }

  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused'
    else if (this.phase === 'paused') this.phase = 'playing'
  }

  tick(dt: number): void {
    if (this.phase !== 'playing') return

    this.gridMovementSystem(dt)
    this.bombSystem(dt)
    this.explosionSystem(dt)
    this.enemySystem(dt)
    this.powerupSystem(dt)
    this.stageSystem(dt)
  }

  isWalkable(x: number, y: number, ignoreBombs = false): boolean {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false
    const tile = this.map[y]![x]
    if (tile === TileType.CONCRETE || tile === TileType.BRICK) return false
    if (!ignoreBombs && this.getEntityAt(x, y, SCHEMA.BOMB) !== null) return false
    return true
  }

  getEntityAt(x: number, y: number, component?: keyof BomberComponents): number | null {
    const entities = this.registry.getEntitiesWith([SCHEMA.GRID_POSITION])
    for (const e of entities) {
      if (e.GridPosition.x === x && e.GridPosition.y === y) {
        if (!component || this.registry.hasComponent(e.id, component)) {
          return e.id
        }
      }
    }
    return null
  }

  getEntitiesAt(x: number, y: number, component?: keyof BomberComponents): number[] {
    const result: number[] = []
    const entities = this.registry.getEntitiesWith([SCHEMA.GRID_POSITION])
    for (const e of entities) {
      if (e.GridPosition.x === x && e.GridPosition.y === y) {
        if (!component || this.registry.hasComponent(e.id, component)) {
          result.push(e.id)
        }
      }
    }
    return result
  }

  getAliveEnemies(): Array<{ id: number; GridPosition: { x: number; y: number } }> {
    const result: Array<{ id: number; GridPosition: { x: number; y: number } }> = []
    const enemies = this.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.ENEMY])
    for (const e of enemies) {
      if (e.Enemy.alive) {
        result.push({ id: e.id, GridPosition: e.GridPosition })
      }
    }
    return result
  }

  private gridMovementSystem(dt: number): void {
    const playerComp = this.registry.getComponent(this.playerId, SCHEMA.PLAYER)
    if (!playerComp || !playerComp.alive) return

    const playerGp = this.registry.getComponent(this.playerId, SCHEMA.GRID_POSITION)
    if (!playerGp) return

    const cooldown = this.registry.getComponent(this.playerId, SCHEMA.MOVE_COOLDOWN)
    if (!cooldown) return

    if (cooldown.remaining > 0) {
      this.registry.addComponent(this.playerId, SCHEMA.MOVE_COOLDOWN, { remaining: Math.max(0, cooldown.remaining - dt) })
    }

    if (this.inputState.dx !== 0 || this.inputState.dy !== 0) {
      const mc = this.registry.getComponent(this.playerId, SCHEMA.MOVE_COOLDOWN)
      if (mc && mc.remaining <= 0) {
        const targetX = playerGp.x + this.inputState.dx
        const targetY = playerGp.y + this.inputState.dy

        if (this.isWalkable(targetX, targetY)) {
          this.registry.addComponent(this.playerId, SCHEMA.GRID_POSITION, { x: targetX, y: targetY })
          this.registry.addComponent(this.playerId, SCHEMA.MOVE_COOLDOWN, { remaining: playerComp.moveInterval })
        }
      }
    }

    if (playerComp.invulnTimer > 0) {
      this.registry.addComponent(this.playerId, SCHEMA.PLAYER, {
        ...playerComp,
        invulnTimer: Math.max(0, playerComp.invulnTimer - dt),
      })
    }

    if (playerComp.bombCooldown > 0) {
      this.registry.addComponent(this.playerId, SCHEMA.PLAYER, {
        ...playerComp,
        bombCooldown: Math.max(0, playerComp.bombCooldown - dt),
      })
    }

    const enemies = this.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.ENEMY, SCHEMA.MOVE_COOLDOWN])
    for (const e of enemies) {
      if (!e.Enemy.alive) continue
      let mc = e.MoveCooldown.remaining
      if (mc > 0) {
        mc -= dt
        this.registry.addComponent(e.id, SCHEMA.MOVE_COOLDOWN, { remaining: mc })
      }
    }
  }

  private bombSystem(dt: number): void {
    const playerComp = this.registry.getComponent(this.playerId, SCHEMA.PLAYER)
    if (!playerComp || !playerComp.alive) return

    const playerGp = this.registry.getComponent(this.playerId, SCHEMA.GRID_POSITION)
    if (!playerGp) return

    if (this.inputState.wantBomb && playerComp.bombCooldown <= 0) {
      const bombAt = this.getEntityAt(playerGp.x, playerGp.y, SCHEMA.BOMB)
      if (!bombAt && this._bombCount < playerComp.bombCount) {
        createEntity(this.registry, {
          [SCHEMA.GRID_POSITION]: { x: playerGp.x, y: playerGp.y },
          [SCHEMA.BOMB]: { timer: BOMB_FUSE_DURATION, radius: playerComp.bombRadius, ownerId: this.playerId },
        })
        this._bombCount++
        this.registry.addComponent(this.playerId, SCHEMA.PLAYER, {
          ...playerComp,
          bombCooldown: BOMB_COOLDOWN,
        })
      }
      this.inputState.wantBomb = false
    }

    const bombs = this.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.BOMB])
    const toExplode: Array<{ id: number; x: number; y: number; radius: number }> = []
    for (const b of bombs) {
      const newTimer = b.Bomb.timer - dt
      if (newTimer <= 0) {
        toExplode.push({ id: b.id, x: b.GridPosition.x, y: b.GridPosition.y, radius: b.Bomb.radius })
        this.registry.removeEntity(b.id)
        this._bombCount = Math.max(0, this._bombCount - 1)
      } else {
        this.registry.addComponent(b.id, SCHEMA.BOMB, { ...b.Bomb, timer: newTimer })
      }
    }

    for (const exp of toExplode) {
      this.triggerExplosion(exp.x, exp.y, exp.radius)
    }
  }

  private triggerExplosion(cx: number, cy: number, radius: number, chain = true): void {
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]]
    const affected: Array<{ x: number; y: number }> = [{ x: cx, y: cy }]

    for (const d of directions) {
      const dx = d[0] as number
      const dy = d[1] as number
      for (let i = 1; i <= radius; i++) {
        const tx = cx + dx * i
        const ty = cy + dy * i
        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) break

        const tile = this.map[ty]![tx]
        if (tile === TileType.CONCRETE) break

        affected.push({ x: tx, y: ty })
        if (tile === TileType.BRICK) break
      }
    }

    for (const pos of affected) {
      const { x, y } = pos

      createEntity(this.registry, {
        [SCHEMA.GRID_POSITION]: { x, y },
        [SCHEMA.EXPLOSION]: { timer: EXPLOSION_DURATION },
      })

      const tile = this.map[y]![x]
      if (tile === TileType.BRICK) {
        this.map[y]![x] = TileType.FLOOR
        if (Math.random() < POWERUP_CHANCE) {
          const types = ['bombUp', 'fireUp', 'speedUp']
          const type = types[Math.floor(Math.random() * types.length)] as string
          createEntity(this.registry, {
            [SCHEMA.GRID_POSITION]: { x, y },
            [SCHEMA.POWERUP]: { type },
          })
        }
      }

      const entities = this.getEntitiesAt(x, y)
      for (const eid of entities) {
        if (eid === this.playerId) {
          const p = this.registry.getComponent(this.playerId, SCHEMA.PLAYER)
          const gp = this.registry.getComponent(this.playerId, SCHEMA.GRID_POSITION)
          if (p && p.alive && p.invulnTimer <= 0 && gp) {
            const newLives = p.lives - EXPLOSION_DAMAGE
            if (newLives <= 0) {
              this.registry.addComponent(this.playerId, SCHEMA.PLAYER, { ...p, alive: false, lives: 0 })
              this.phase = 'gameover'
            } else {
              this.registry.addComponent(this.playerId, SCHEMA.PLAYER, {
                ...p, lives: newLives, invulnTimer: PLAYER_INVULN_DURATION,
              })
              this.registry.addComponent(this.playerId, SCHEMA.GRID_POSITION, { x: 1, y: 1 })
            }
          }
        } else {
          const enemy = this.registry.getComponent(eid, SCHEMA.ENEMY)
          if (enemy && enemy.alive) {
            this.registry.addComponent(eid, SCHEMA.ENEMY, { ...enemy, alive: false })
            this.score += 100 * this.stage
          }
        }

        if (chain) {
          const bomb = this.registry.getComponent(eid, SCHEMA.BOMB)
          if (bomb) {
            this.triggerExplosion(x, y, bomb.radius, false)
            this.registry.removeEntity(eid)
            this._bombCount = Math.max(0, this._bombCount - 1)
          }
        }
      }
    }
  }

  private explosionSystem(dt: number): void {
    const explosions = this.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.EXPLOSION])
    for (const e of explosions) {
      const newTimer = e.Explosion.timer - dt
      if (newTimer <= 0) {
        this.registry.removeEntity(e.id)
      } else {
        this.registry.addComponent(e.id, SCHEMA.EXPLOSION, { timer: newTimer })
      }
    }
  }

  private enemySystem(dt: number): void {
    const enemies = this.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.ENEMY, SCHEMA.MOVE_COOLDOWN])

    for (const e of enemies) {
      if (!e.Enemy.alive) continue

      const mc = e.MoveCooldown.remaining
      if (mc > 0) continue

      const moveTimer = e.Enemy.moveTimer - dt
      let dirX = e.Enemy.dirX
      let dirY = e.Enemy.dirY
      if (moveTimer <= 0) {
        const dir = randomDir()
        dirX = dir.x
        dirY = dir.y
      }

      const targetX = e.GridPosition.x + dirX
      const targetY = e.GridPosition.y + dirY

      if (this.isWalkable(targetX, targetY, true)) {
        const newMoveTimer = moveTimer <= 0 ? ENEMY_DIR_CHANGE_INTERVAL : moveTimer
        this.registry.addComponent(e.id, SCHEMA.ENEMY, { ...e.Enemy, dirX, dirY, moveTimer: newMoveTimer })
        this.registry.addComponent(e.id, SCHEMA.GRID_POSITION, { x: targetX, y: targetY })
        this.registry.addComponent(e.id, SCHEMA.MOVE_COOLDOWN, { remaining: ENEMY_MOVE_INTERVAL })
      } else {
        const dir = randomDir()
        this.registry.addComponent(e.id, SCHEMA.ENEMY, { ...e.Enemy, dirX: dir.x, dirY: dir.y })
        this.registry.addComponent(e.id, SCHEMA.MOVE_COOLDOWN, { remaining: ENEMY_MOVE_INTERVAL })
      }
    }
  }

  private powerupSystem(_dt: number): void {
    const playerGp = this.registry.getComponent(this.playerId, SCHEMA.GRID_POSITION)
    const playerComp = this.registry.getComponent(this.playerId, SCHEMA.PLAYER)
    if (!playerGp || !playerComp || !playerComp.alive) return

    const powerups = this.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.POWERUP])
    for (const p of powerups) {
      if (p.GridPosition.x === playerGp.x && p.GridPosition.y === playerGp.y) {
        const pComp = { ...playerComp }
        switch (p.Powerup.type) {
          case 'bombUp':
            pComp.bombCount = Math.min(pComp.bombCount + 1, 8)
            break
          case 'fireUp':
            pComp.bombRadius = Math.min(pComp.bombRadius + 1, 8)
            break
          case 'speedUp':
            pComp.moveInterval = Math.max(pComp.moveInterval - 50, 100)
            break
        }
        this.registry.addComponent(this.playerId, SCHEMA.PLAYER, pComp)
        this.registry.removeEntity(p.id)
        this.score += 50
      }
    }
  }

  private stageSystem(_dt: number): void {
    if (this.phase === 'gameover') return

    const playerComp = this.registry.getComponent(this.playerId, SCHEMA.PLAYER)
    const playerGp = this.registry.getComponent(this.playerId, SCHEMA.GRID_POSITION)
    if (!playerComp || !playerGp) return

    const aliveEnemies = this.getAliveEnemies()
    if (aliveEnemies.length === 0 && !this.exitRevealed) {
      this.exitRevealed = true
      this.registry.addComponent(this.doorId, SCHEMA.DOOR, { open: true })
    }

    if (this.exitRevealed && playerGp.x === this.doorPos.x && playerGp.y === this.doorPos.y) {
      this.phase = 'won'
    }
  }
}

function randomDir(): { x: number; y: number } {
  const dirs = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ]
  return dirs[Math.floor(Math.random() * dirs.length)]!
}
