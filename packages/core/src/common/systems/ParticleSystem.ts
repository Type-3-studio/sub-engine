import type { Registry } from '../../engine/types.js'

export interface ParticleEmitterDef {
  rate: number
  lifetime: number
  speed: number
  color: string
  size: number
  active: boolean
}

export interface ParticleDef {
  remaining: number
  color: string
  size: number
}

export type ParticleSystemComponents = {
  'ParticleEmitter': ParticleEmitterDef
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Particle': ParticleDef
}

export function particleSystem(
  registry: Registry<ParticleSystemComponents>,
  dt: number,
): Registry<ParticleSystemComponents> {
  const particles = registry.getEntitiesWith(['Particle'])
  for (const e of particles) {
    const p = e.Particle
    const newRemaining = p.remaining - dt
    if (newRemaining <= 0) {
      registry.removeEntity(e.id)
    } else {
      registry.addComponent(e.id, 'Particle', {
        ...p,
        remaining: newRemaining,
      })
    }
  }

  const emitters = registry.getEntitiesWith(['ParticleEmitter', 'Position'])
  for (const e of emitters) {
    const pe = e.ParticleEmitter
    const pos = e.Position

    if (!pe.active) continue

    const particlesPerTick = pe.rate * (dt / 1000)
    let count = Math.floor(particlesPerTick)
    const frac = particlesPerTick - count
    if (Math.random() < frac) count++

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const spd = pe.speed * (0.5 + Math.random() * 0.5)
      const p = registry.createEntity()
      registry.addComponent(p, 'Position', { x: pos.x, y: pos.y })
      registry.addComponent(p, 'Velocity', {
        x: Math.cos(angle) * spd,
        y: Math.sin(angle) * spd,
      })
      registry.addComponent(p, 'Particle', {
        remaining: pe.lifetime,
        color: pe.color,
        size: pe.size,
      })
    }
  }

  return registry
}
