import { createEntity } from '@sub-engine/core'
import type { Registry } from '@sub-engine/core'
import { SCHEMA } from '../contract.js'
import type { ScrapSwarmComponents } from '../contract.js'
import { WAVE_DEFS, ENEMY_SPEED, ENEMY_HP, ENEMY_DAMAGE, ENEMY_REWARD, MAP_COLS, MAP_ROWS, WAVE_START_DELAY } from '../config.js'

function randomEdgePosition(): { x: number; y: number } {
  const side = Math.floor(Math.random() * 4)
  switch (side) {
    case 0: return { x: 0.5, y: Math.random() * (MAP_ROWS - 1) + 0.5 }
    case 1: return { x: MAP_COLS - 0.5, y: Math.random() * (MAP_ROWS - 1) + 0.5 }
    case 2: return { x: Math.random() * (MAP_COLS - 1) + 0.5, y: 0.5 }
    default: return { x: Math.random() * (MAP_COLS - 1) + 0.5, y: MAP_ROWS - 0.5 }
  }
}

export function getWaveState(registry: Registry<ScrapSwarmComponents>): { wave: number; phase: string } {
  const ents = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (!ents.length) return { wave: 0, phase: 'idle' }
  return { wave: ents[0]!.GameState.wave, phase: ents[0]!.GameState.phase }
}

export function startWave(registry: Registry<ScrapSwarmComponents>, waveIndex: number): boolean {
  if (waveIndex >= WAVE_DEFS.length) {
    const states = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (states.length) {
      registry.addComponent(states[0]!.id, SCHEMA.GAME_STATE, {
        ...states[0]!.GameState, phase: 'victory',
      })
    }
    return false
  }

  const def = WAVE_DEFS[waveIndex]!
  createEntity(registry, {
    [SCHEMA.WAVE_CONFIG]: {
      count: def.count,
      spawned: 0,
      interval: def.spawnInterval,
      timer: 0,
      variants: [`melee_${waveIndex}`],
    },
  })

  const states = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (states.length) {
    registry.addComponent(states[0]!.id, SCHEMA.GAME_STATE, {
      ...states[0]!.GameState, phase: 'wave', wave: waveIndex,
    })
  }

  return true
}

export function waveSystem(registry: Registry<ScrapSwarmComponents>, dt: number): Registry<ScrapSwarmComponents> {
  const states = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (!states.length) return registry
  const state = states[0]!.GameState

  if (state.phase === 'idle') {
    const newTimer = state.tick + dt
    if (newTimer >= WAVE_START_DELAY) {
      startWave(registry, state.wave)
    } else {
      registry.addComponent(states[0]!.id, SCHEMA.GAME_STATE, {
        ...state, tick: newTimer,
      })
    }
    return registry
  }

  if (state.phase === 'wave') {
    const configs = registry.getEntitiesWith([SCHEMA.WAVE_CONFIG])
    let allDone = true

    for (const cfg of configs) {
      const wc = cfg.WaveConfig
      if (wc.spawned >= wc.count) {
        const aliveEnemies = registry.getEntitiesWith([SCHEMA.ENEMY]).length
        if (aliveEnemies === 0) {
          registry.removeEntity(cfg.id)
        } else {
          allDone = false
        }
        continue
      }

      allDone = false
      const newTimer = wc.timer + dt

      if (newTimer >= wc.interval) {
        const pos = randomEdgePosition()
        const waveIdx = state.wave
        const def = WAVE_DEFS[waveIdx] ?? WAVE_DEFS[WAVE_DEFS.length - 1]!
        createEntity(registry, {
          [SCHEMA.POSITION]: { x: pos.x, y: pos.y },
          [SCHEMA.VELOCITY]: { x: 0, y: 0 },
          [SCHEMA.HEALTH]: { current: Math.round(ENEMY_HP * def.hpMult), max: Math.round(ENEMY_HP * def.hpMult) },
          [SCHEMA.ENEMY]: { damage: Math.round(ENEMY_DAMAGE * def.speedMult), speed: ENEMY_SPEED * def.speedMult, reward: ENEMY_REWARD, variant: 'melee' },
          [SCHEMA.ACCUMULATOR]: { value: 0, threshold: 500 },
          [SCHEMA.COLLIDER]: { width: 0.4, height: 0.4, solid: true },
          [SCHEMA.LABEL]: { value: 'enemy' },
        })
        if (states.length) {
          registry.addComponent(states[0]!.id, SCHEMA.GAME_STATE, {
            ...states[0]!.GameState, totalSpawned: states[0]!.GameState.totalSpawned + 1,
          })
        }
        registry.addComponent(cfg.id, SCHEMA.WAVE_CONFIG, {
          ...wc, spawned: wc.spawned + 1, timer: newTimer - wc.interval,
        })
      } else {
        registry.addComponent(cfg.id, SCHEMA.WAVE_CONFIG, {
          ...wc, timer: newTimer,
        })
      }
    }

    if (allDone) {
      const nextWave = state.wave + 1
      if (nextWave >= WAVE_DEFS.length) {
        registry.addComponent(states[0]!.id, SCHEMA.GAME_STATE, {
          ...state, phase: 'victory', wave: nextWave,
        })
      } else {
        registry.addComponent(states[0]!.id, SCHEMA.GAME_STATE, {
          ...state, phase: 'idle', wave: nextWave, tick: 0,
        })
      }
    }
  }

  return registry
}
