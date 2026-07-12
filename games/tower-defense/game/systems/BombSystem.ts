import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { TdComponents } from '../contract.js'

export function bombSystem(
  registry: Registry<TdComponents>,
  dt: number,
  blockedCells: Set<string>,
): Registry<TdComponents> {
  const bombs = registry.getEntitiesWith([SCHEMA.BOMB, SCHEMA.POSITION])
  const enemies = registry.getEntitiesWith([SCHEMA.ENEMY, SCHEMA.POSITION, SCHEMA.HEALTH])
  const towers = registry.getEntitiesWith([SCHEMA.TOWER, SCHEMA.POSITION])
  const toExplode: number[] = []

  for (const bomb of bombs) {
    const b = bomb.Bomb

    if (b.placedBy === 'player') {
      for (const enemy of enemies) {
        const dx = enemy.Position.x - bomb.Position.x
        const dy = enemy.Position.y - bomb.Position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= b.range) {
          toExplode.push(bomb.id)
          break
        }
      }
    } else {
      b.fuseTimer -= dt
      if (b.fuseTimer <= 0) {
        toExplode.push(bomb.id)
      }
    }
  }

  for (const id of toExplode) {
    const bombPos = registry.getComponent(id, SCHEMA.POSITION)
    const bombComp = registry.getComponent(id, SCHEMA.BOMB)
    if (!bombPos || !bombComp) continue

    const cellKey = `${Math.floor(bombPos.x)},${Math.floor(bombPos.y)}`
    blockedCells.delete(cellKey)

    if (bombComp.placedBy === 'player') {
      for (const enemy of enemies) {
        const dx = enemy.Position.x - bombPos.x
        const dy = enemy.Position.y - bombPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= bombComp.range) {
          const hp = enemy.Health
          const newHp = Math.max(0, hp.current - bombComp.damage)
          registry.addComponent(enemy.id, SCHEMA.HEALTH, { current: newHp, max: hp.max })
          if (newHp <= 0) {
            const enemyComp = registry.getComponent(enemy.id, SCHEMA.ENEMY)
            if (enemyComp) {
              const state = registry.getEntitiesWith([SCHEMA.GAME_STATE])
              if (state.length > 0) {
                const gs = state[0]!
                const gsData = gs.GameState
                registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
                  money: gsData.money + enemyComp.reward,
                  lives: gsData.lives,
                  wave: gsData.wave,
                  phase: gsData.phase,
                })
              }
            }
            registry.removeEntity(enemy.id)
          }
        }
      }
    } else {
      for (const tower of towers) {
        const dx = tower.Position.x - bombPos.x
        const dy = tower.Position.y - bombPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= bombComp.range) {
          const t = tower.Tower
          const newHp = Math.max(0, t.hp - bombComp.damage)
          registry.addComponent(tower.id, SCHEMA.TOWER, { ...t, hp: newHp })
          if (newHp <= 0) {
            const state = registry.getEntitiesWith([SCHEMA.GAME_STATE])
            if (state.length > 0) {
              const gs = state[0]!
              const gsData = gs.GameState
              registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
                money: gsData.money,
                lives: gsData.lives - 1,
                wave: gsData.wave,
                phase: gsData.lives - 1 <= 0 ? 'gameover' : gsData.phase,
              })
            }
            registry.removeEntity(tower.id)
          }
        }
      }
    }

    registry.removeEntity(id)
  }

  return registry
}
