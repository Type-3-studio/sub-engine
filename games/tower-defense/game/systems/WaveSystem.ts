import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { TdComponents } from '../contract.js'
import { BOMBER_CONFIG } from '../config/towerDefense.js'

export function waveSystem(registry: Registry<TdComponents>): Registry<TdComponents> {
  const stateEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (stateEnts.length === 0) return registry
  const gs = stateEnts[0]!
  const state = gs.GameState

  if (state.phase === 'gameover') return registry

  const waveEnts = registry.getEntitiesWith([SCHEMA.WAVE_CONFIG])
  let wave = waveEnts.length > 0 ? waveEnts[0] : null

  if (!wave) {
    registry.addComponent(gs.id, SCHEMA.GAME_STATE, { ...state, phase: 'building' })
    return registry
  }

  const wc = wave.WaveConfig

  if (state.phase === 'wave' && wc.spawned < wc.count) {
    const now = performance.now()
    if (now - wc.spawnTimer >= wc.spawnInterval) {
      const enemy = registry.createEntity()
      const waypoints = wc.waypoints.map(w => ({ x: w.x, y: w.y }))
      registry.addComponent(enemy, SCHEMA.POSITION, { x: waypoints[0]!.x, y: waypoints[0]!.y })
      registry.addComponent(enemy, 'TdPathFollower', {
        waypoints,
        waypointIndex: 1,
        speed: wc.enemySpeed,
      })
      registry.addComponent(enemy, SCHEMA.HEALTH, { current: wc.enemyHealth, max: wc.enemyHealth })
      registry.addComponent(enemy, SCHEMA.ENEMY, { reward: wc.reward })
      registry.addComponent(enemy, SCHEMA.LABEL, { value: 'Enemy' })

      if (wc.hasBomber) {
        registry.addComponent(enemy, SCHEMA.BOMBER, {
          bombInterval: BOMBER_CONFIG.bombInterval,
          bombTimer: BOMBER_CONFIG.bombInterval,
          bombDamage: BOMBER_CONFIG.bombDamage,
          bombRange: BOMBER_CONFIG.bombRange,
          bombFuse: BOMBER_CONFIG.bombFuse,
        })
      }

      registry.addComponent(wave.id, SCHEMA.WAVE_CONFIG, {
        ...wc,
        spawned: wc.spawned + 1,
        spawnTimer: now,
      })
    }
  }

  if (state.phase === 'wave') {
    const aliveEnemies = registry.getEntitiesWith([SCHEMA.ENEMY])
    if (wc.spawned >= wc.count && aliveEnemies.length === 0) {
      const nextWave = state.wave + 1
      registry.addComponent(gs.id, SCHEMA.GAME_STATE, { ...state, phase: 'building', wave: nextWave })
      registry.removeEntity(wave.id)
    }
  }

  return registry
}
