import { describe, it, expect } from 'vitest'
import { createRegistry, schemaExists } from '@sub-engine/core'
import { particleSystem } from '@sub-engine/core'

describe('Particle Schemas', () => {
  it('ParticleEmitter schema is registered', () => {
    expect(schemaExists('ParticleEmitter')).toBe(true)
  })

  it('Particle schema is registered', () => {
    expect(schemaExists('Particle')).toBe(true)
  })
})

describe('ParticleSystem', () => {
  it('spawns particles from active emitter', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'ParticleEmitter', {
      rate: 60,
      lifetime: 1000,
      speed: 100,
      color: '#ff4400',
      size: 4,
      active: true,
    })
    registry.addComponent(e, 'Position', { x: 200, y: 300 })

    particleSystem(registry, 1000)
    particleSystem(registry, 1000)

    const particles = registry.getEntitiesWith('Particle')
    expect(particles.length).toBeGreaterThanOrEqual(1)
  })

  it('does not spawn particles from inactive emitter', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'ParticleEmitter', {
      rate: 60,
      lifetime: 1000,
      speed: 100,
      color: '#ff4400',
      size: 4,
      active: false,
    })
    registry.addComponent(e, 'Position', { x: 200, y: 300 })

    particleSystem(registry, 1000)

    const particles = registry.getEntitiesWith('Particle')
    expect(particles.length).toBe(0)
  })

  it('removes expired particles', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'ParticleEmitter', {
      rate: 60,
      lifetime: 50,
      speed: 100,
      color: '#ff4400',
      size: 4,
      active: true,
    })
    registry.addComponent(e, 'Position', { x: 200, y: 300 })

    particleSystem(registry, 60)
    const before = registry.getEntitiesWith('Particle')
    expect(before.length).toBeGreaterThan(0)

    registry.addComponent(e, 'ParticleEmitter', {
      rate: 60,
      lifetime: 50,
      speed: 100,
      color: '#ff4400',
      size: 4,
      active: false,
    })

    particleSystem(registry, 100)

    const after = registry.getEntitiesWith('Particle')
    expect(after.length).toBe(0)
  })

  it('runs on empty registry', () => {
    const registry = createRegistry()
    expect(() => particleSystem(registry, 16)).not.toThrow()
  })

  it('particles spawn with Velocity component', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'ParticleEmitter', {
      rate: 10,
      lifetime: 5000,
      speed: 50,
      color: '#00ff00',
      size: 3,
      active: true,
    })
    registry.addComponent(e, 'Position', { x: 100, y: 100 })

    particleSystem(registry, 1000)

    const particles = registry.getEntitiesWith(['Particle', 'Position', 'Velocity'])
    for (const p of particles) {
      const vel = registry.getComponent(p.id, 'Velocity') as any
      expect(vel).toBeDefined()
      expect(typeof vel.x).toBe('number')
      expect(typeof vel.y).toBe('number')
    }
  })

  it('fractional rate spawns probabilistically', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'ParticleEmitter', {
      rate: 1,
      lifetime: 5000,
      speed: 50,
      color: '#ffffff',
      size: 2,
      active: true,
    })
    registry.addComponent(e, 'Position', { x: 0, y: 0 })

    let total = 0
    for (let i = 0; i < 100; i++) {
      const reg2 = createRegistry()
      const e2 = reg2.createEntity()
      reg2.addComponent(e2, 'ParticleEmitter', {
        rate: 1,
        lifetime: 5000,
        speed: 50,
        color: '#ffffff',
        size: 2,
        active: true,
      })
      reg2.addComponent(e2, 'Position', { x: 0, y: 0 })
      particleSystem(reg2, 500)
      total += reg2.getEntitiesWith('Particle').length
    }
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan(100)
  })
})
