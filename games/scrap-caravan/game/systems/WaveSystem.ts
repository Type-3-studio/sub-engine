import type { Registry } from '@sub-engine/core'
import type { ScrapCaravanComponents } from '../contract.js'
import { SCHEMA } from '../contract.js'
import { spawnStorm } from './WeatherSystem.js'

export interface WaveDef {
  beetleCount: number
  beetleSpeed: number
  beetleHealth: number
  spawnInterval: number
  stormChance: number
}

export const WAVES: WaveDef[] = [
  { beetleCount: 3, beetleSpeed: 1.5, beetleHealth: 15, spawnInterval: 2000, stormChance: 0 },
  { beetleCount: 5, beetleSpeed: 1.6, beetleHealth: 20, spawnInterval: 1800, stormChance: 0.2 },
  { beetleCount: 7, beetleSpeed: 1.8, beetleHealth: 25, spawnInterval: 1500, stormChance: 0.3 },
  { beetleCount: 10, beetleSpeed: 2.0, beetleHealth: 30, spawnInterval: 1300, stormChance: 0.4 },
  { beetleCount: 12, beetleSpeed: 2.2, beetleHealth: 35, spawnInterval: 1200, stormChance: 0.5 },
]

export const SPAWN_POSITIONS = [
  { x: -1, y: 0 },
  { x: -1, y: 3 },
  { x: -1, y: 6 },
  { x: -1, y: 9 },
  { x: 16, y: 2 },
  { x: 16, y: 5 },
  { x: 16, y: 8 },
  { x: 16, y: 11 },
]

export const STORM_POSITIONS = [
  { x: 4, y: 3 },
  { x: 10, y: 7 },
  { x: 7, y: 9 },
  { x: 12, y: 4 },
]

export interface WaveState {
  wave: number
  phase: 'idle' | 'active' | 'cooldown'
  spawned: number
  spawnTimer: number
  cooldownTimer: number
}

export function waveSystem(registry: Registry<ScrapCaravanComponents>, dt: number): Registry<ScrapCaravanComponents> {
  const labels = registry.getEntitiesWith([SCHEMA.LABEL])
  let waveState = labels.find(l => l.Label.value === 'wave-state')
  let wsId: number

  if (!waveState) {
    wsId = registry.createEntity()
    registry.addComponent(wsId, SCHEMA.LABEL, { value: 'wave-state' })
    registry.addComponent(wsId, SCHEMA.DRONE_AI, {
      state: 'idle',
      targetNodeId: null,
      cargo: [],
      maxCargo: 0,
      cargoCapacity: 0,
    })
  } else {
    wsId = waveState.id
  }
  const ai = registry.getComponent(wsId, SCHEMA.DRONE_AI) as any
  if (!ai) return registry

  const ws: WaveState = ai._waveState ?? { wave: 0, phase: 'idle', spawned: 0, spawnTimer: 0, cooldownTimer: 0 }

  if (ws.phase === 'idle') {
    return registry
  }

  if (ws.phase === 'active') {
    const waveData = WAVES[ws.wave]
    if (!waveData) {
      ws.phase = 'idle'
      registry.addComponent(wsId, SCHEMA.DRONE_AI, { ...ai, _waveState: ws })
      return registry
    }

    ws.spawnTimer += dt
    if (ws.spawnTimer >= waveData.spawnInterval && ws.spawned < waveData.beetleCount) {
      const spawn = SPAWN_POSITIONS[ws.spawned % SPAWN_POSITIONS.length]!
      const beetle = registry.createEntity()
      registry.addComponent(beetle, SCHEMA.POSITION, { x: spawn.x, y: spawn.y })
      registry.addComponent(beetle, SCHEMA.VELOCITY, { x: 1, y: 0 })
      registry.addComponent(beetle, SCHEMA.HEALTH, { current: waveData.beetleHealth, max: waveData.beetleHealth })
      registry.addComponent(beetle, SCHEMA.SWARM_BEETLE, { damage: 5, speed: waveData.beetleSpeed })
      registry.addComponent(beetle, SCHEMA.LABEL, { value: 'beetle' })

      ws.spawned++
      ws.spawnTimer = 0
    }

    if (Math.random() < waveData.stormChance * (dt / 5000)) {
      const pos = STORM_POSITIONS[Math.floor(Math.random() * STORM_POSITIONS.length)]!
      spawnStorm(registry, pos.x, pos.y, 3, 3000, 3)
    }

    const aliveBeetles = registry.getEntitiesWith([SCHEMA.SWARM_BEETLE])
    if (ws.spawned >= waveData.beetleCount && aliveBeetles.length === 0) {
      ws.phase = 'cooldown'
      ws.cooldownTimer = 0
    }
  }

  if (ws.phase === 'cooldown') {
    ws.cooldownTimer += dt
    if (ws.cooldownTimer >= 3000) {
      ws.wave++
      ws.phase = 'active'
      ws.spawned = 0
      ws.spawnTimer = 0
    }
  }

  registry.addComponent(wsId, SCHEMA.DRONE_AI, { ...ai, _waveState: ws })
  return registry
}

export function startWave(registry: Registry<ScrapCaravanComponents>, waveIndex: number): void {
  const labels = registry.getEntitiesWith([SCHEMA.LABEL])
  const waveState = labels.find(l => l.Label.value === 'wave-state')
  if (!waveState) return
  const ai = registry.getComponent(waveState.id, SCHEMA.DRONE_AI) as any
  if (!ai) return
  registry.addComponent(waveState.id, SCHEMA.DRONE_AI, {
    ...ai,
    _waveState: { wave: waveIndex, phase: 'active', spawned: 0, spawnTimer: 0, cooldownTimer: 0 },
  })
}

export function getWaveState(registry: Registry<ScrapCaravanComponents>): { wave: number; phase: string } {
  const labels = registry.getEntitiesWith([SCHEMA.LABEL])
  const waveState = labels.find(l => l.Label.value === 'wave-state')
  if (!waveState) return { wave: 0, phase: 'idle' }
  const ai = registry.getComponent(waveState.id, SCHEMA.DRONE_AI) as any
  const ws = ai?._waveState as WaveState | undefined
  if (!ws) return { wave: 0, phase: 'idle' }
  return { wave: ws.wave, phase: ws.phase }
}
