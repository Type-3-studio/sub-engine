import { Application, Graphics, Text } from 'pixi.js'
import { createRegistry, combatSystem } from '@sub-engine/core'
import { createResponsiveContainer } from '@sub-engine/pixi'
import { SCHEMA } from '../game/contract.js'
import type { CombatComponents } from '../game/contract.js'

const W = 640
const H = 480
const ARCHER_COUNT = 3
const MELEE_COUNT = 4

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x111122, antialias: true })
  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const container = createResponsiveContainer(app, W, H)
  const gfx = new Graphics()
  container.addChild(gfx)

  const info = new Text({
    text: '',
    style: { fill: 0xffffff, fontSize: 14, fontFamily: 'monospace' },
  })
  info.x = 10
  info.y = 10
  container.addChild(info)

  const registry = createRegistry<CombatComponents>()

  function spawnArchers(): void {
    for (let i = 0; i < ARCHER_COUNT; i++) {
      const id = registry.createEntity()
      registry.addComponent(id, SCHEMA.POSITION, { x: 50, y: 80 + i * 120 })
      registry.addComponent(id, SCHEMA.HEALTH, { current: 30, max: 30 })
      registry.addComponent(id, SCHEMA.GROUP, { name: 'archer' })
    }
  }

  function spawnMelee(): void {
    for (let i = 0; i < MELEE_COUNT; i++) {
      const id = registry.createEntity()
      registry.addComponent(id, SCHEMA.POSITION, { x: 580, y: 60 + i * 100 })
      registry.addComponent(id, SCHEMA.HEALTH, { current: 50, max: 50 })
      registry.addComponent(id, SCHEMA.GROUP, { name: 'melee' })
      registry.addComponent(id, SCHEMA.TARGET_SCANNER, { range: 300, targetEntity: 0 })
    }
  }

  spawnArchers()
  spawnMelee()

  function assignTargets(): void {
    const allWithGroup = registry.getEntitiesWith([SCHEMA.GROUP, SCHEMA.POSITION])
    const meleeIds = allWithGroup.filter(e => e.Group.name === 'melee').map(e => e.id)
    const archerIds = allWithGroup.filter(e => e.Group.name === 'archer').map(e => e.id)

    for (const mid of meleeIds) {
      if (!registry.entityExists(mid)) continue
      if (!registry.hasComponent(mid, SCHEMA.TARGET_SCANNER)) continue
      let closest: number | null = null
      let closestDist = Infinity
      const meleePos = registry.getComponent(mid, SCHEMA.POSITION)
      if (!meleePos) continue
      for (const aid of archerIds) {
        if (!registry.entityExists(aid)) continue
        const ap = registry.getComponent(aid, SCHEMA.POSITION)
        if (!ap) continue
        const dx = meleePos.x - ap.x
        const dy = meleePos.y - ap.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < closestDist) { closestDist = d; closest = aid }
      }
      if (closest !== null) {
        registry.addComponent(mid, SCHEMA.TARGET_SCANNER, { range: 300, targetEntity: closest })
      }
    }
  }

  function moveMelee(): void {
    const melee = registry.getEntitiesWith([SCHEMA.GROUP, SCHEMA.POSITION])
      .filter(e => e.Group.name === 'melee')
    for (const { id } of melee) {
      if (!registry.entityExists(id)) continue
      const pos = registry.getComponent(id, SCHEMA.POSITION)
      if (!pos) continue
      registry.addComponent(id, SCHEMA.POSITION, { x: pos.x - 1.5, y: pos.y })
    }
  }

  function removeDead(): void {
    const all = registry.getEntitiesWith([SCHEMA.HEALTH])
    for (const { id, Health } of all) {
      if (Health.current <= 0) {
        registry.removeEntity(id)
      }
    }
  }

  function checkVictory(): string {
    const archers = registry.getEntitiesWith([SCHEMA.GROUP]).filter(e => e.Group.name === 'archer')
    const melee = registry.getEntitiesWith([SCHEMA.GROUP]).filter(e => e.Group.name === 'melee')
    if (archers.length === 0) return 'Melee wins!'
    if (melee.length === 0) return 'Archers win!'
    return `Archers: ${archers.length}  Melee: ${melee.length}`
  }

  function render(): void {
    gfx.clear()
    const entities = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.HEALTH, SCHEMA.GROUP])
    for (const { Position, Health, Group } of entities) {
      const color = Group.name === 'archer' ? 0x44aaff : 0xff6644
      gfx.fill(color)
      gfx.rect(Position.x - 10, Position.y - 10, 20, 20)
      gfx.fill()
      const barW = 26
      gfx.fill(0x333333)
      gfx.rect(Position.x - 13, Position.y - 18, barW, 4)
      gfx.fill()
      const ratio = Math.max(0, Health.current / Health.max)
      gfx.fill(ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff2222)
      gfx.rect(Position.x - 13, Position.y - 18, barW * ratio, 4)
      gfx.fill()
    }
    info.text = checkVictory()
  }

  assignTargets()
  render()

  app.ticker.add(() => {
    moveMelee()
    assignTargets()
    combatSystem(registry, 16)
    removeDead()
    render()
  })
}
