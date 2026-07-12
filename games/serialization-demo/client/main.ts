import { Application, Graphics, Text } from 'pixi.js'
import { createRegistry } from '@sub-engine/core'
import { createResponsiveContainer } from '@sub-engine/pixi'
import { SCHEMA } from '../game/contract.js'
import type { SerialComponents } from '../game/contract.js'

const W = 640
const H = 480

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x0a0a1a, antialias: true })
  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const container = createResponsiveContainer(app, W, H)
  const gfx = new Graphics()
  container.addChild(gfx)

  const heading = new Text({
    text: 'ECS Serialization Demo — Save / Load Registry State',
    style: { fill: 0xffffff, fontSize: 14, fontFamily: 'monospace' },
  })
  heading.x = 10
  heading.y = 10
  container.addChild(heading)

  const output = document.getElementById('output') as HTMLPreElement | null
  const status = document.getElementById('status') as HTMLSpanElement | null
  let savedJson: string | null = null

  function show(text: string): void {
    if (output) output.textContent = text
  }

  let registry = createRegistry<SerialComponents>()

  function spawnDemoState(): void {
    registry = createRegistry<SerialComponents>()
    const hero = registry.createEntity()
    registry.addComponent(hero, SCHEMA.POSITION, { x: 100, y: 200 })
    registry.addComponent(hero, SCHEMA.HEALTH, { current: 80, max: 100 })
    registry.addComponent(hero, SCHEMA.PLAYER, { name: 'Hero', level: 5, xp: 320 })

    const sword = registry.createEntity()
    registry.addComponent(sword, SCHEMA.POSITION, { x: 300, y: 150 })
    registry.addComponent(sword, SCHEMA.ITEM, { name: 'Iron Sword', value: 150, equippable: true })

    const shield = registry.createEntity()
    registry.addComponent(shield, SCHEMA.POSITION, { x: 400, y: 300 })
    registry.addComponent(shield, SCHEMA.ITEM, { name: 'Wooden Shield', value: 75, equippable: true })

    const goblin = registry.createEntity()
    registry.addComponent(goblin, SCHEMA.POSITION, { x: 500, y: 100 })
    registry.addComponent(goblin, SCHEMA.VELOCITY, { x: -1, y: 0.5 })
    registry.addComponent(goblin, SCHEMA.HEALTH, { current: 25, max: 25 })

    savedJson = null
    if (status) status.textContent = 'Demo state created'
    render()
    show('Spawned 4 entities with various components\nClick "Save State" to serialize')
  }

  function saveState(): void {
    const data = registry.getAllEntities()
    savedJson = JSON.stringify(data, null, 2)
    show(savedJson)
    if (status) status.textContent = `Saved: ${data.length} entities, ${savedJson.length} bytes`
  }

  function loadState(): void {
    if (!savedJson) {
      if (status) status.textContent = 'Nothing saved yet — click "Save State" first'
      return
    }
    const data = JSON.parse(savedJson) as Array<Record<string, any>>
    registry = createRegistry<SerialComponents>()
    const idMap: Record<number, number> = {}
    for (const entity of data) {
      const oldId = entity.id as number
      const newId = registry.createEntity()
      idMap[oldId] = newId
      for (const [compName, compData] of Object.entries(entity)) {
        if (compName === 'id') continue
        registry.addComponent(newId, compName as any, compData as Record<string, unknown>)
      }
    }
    render()
    if (status) status.textContent = `Loaded ${data.length} entities (IDs remapped)`
    show(JSON.stringify(registry.getAllEntities(), null, 2))
  }

  function verifyRoundTrip(): void {
    const before = registry.getAllEntities()
    const json = JSON.stringify(before)
    const parsed = JSON.parse(json) as Array<Record<string, any>>
    const reg2 = createRegistry<SerialComponents>()
    const idMap: Record<number, number> = {}
    for (const entity of parsed) {
      const oldId = entity.id as number
      const newId = reg2.createEntity()
      idMap[oldId] = newId
      for (const [compName, compData] of Object.entries(entity)) {
        if (compName === 'id') continue
        reg2.addComponent(newId, compName as any, compData as Record<string, unknown>)
      }
    }
    const after = reg2.getAllEntities()
    const stripId = (e: Record<string, any>): Record<string, any> => {
      const { id, ...rest } = e
      return rest
    }
    const afterJson = JSON.stringify(after.map(stripId))
    const beforeJson = JSON.stringify(before.map(stripId))
    const match = afterJson === beforeJson
    show(`Before: ${beforeJson.length} chars\nAfter:  ${afterJson.length} chars\nMatch:  ${match ? '✓ YES' : '✗ NO'}\n\nRound-trip fidelity: ${match ? 'PASS' : 'FAIL'}`)
    if (status) status.textContent = match ? 'Round-trip: PASS' : 'Round-trip: FAIL'
  }

  function render(): void {
    gfx.clear()
    const entities = registry.getAllEntities()
    for (const e of entities) {
      if (!e.Position) continue
      const color = e.Player ? 0x44aaff : e.Item ? 0xffdd44 : e.Health ? 0xff4444 : 0x888888
      gfx.fill(color)
      gfx.circle(e.Position.x, e.Position.y, 8)
      gfx.fill()
      if (e.Player) {
        gfx.fill(0xffffff)
        const label = new Text({ text: e.Player.name, style: { fontSize: 10, fontFamily: 'monospace' } })
        label.x = e.Position.x - 10
        label.y = e.Position.y - 18
        container.addChild(label)
      }
      if (e.Health) {
        const barW = 20
        gfx.fill(0x333333)
        gfx.rect(e.Position.x - barW / 2, e.Position.y - 14, barW, 3)
        gfx.fill()
        const ratio = e.Health.current / e.Health.max
        gfx.fill(ratio > 0.5 ? 0x44ff44 : 0xffaa00)
        gfx.rect(e.Position.x - barW / 2, e.Position.y - 14, barW * ratio, 3)
        gfx.fill()
      }
    }
    if (entities.length === 0) {
      gfx.fill(0x888888)
      const emptyLabel = new Text({ text: 'No entities — click "Spawn Entities"', style: { fontSize: 16, fontFamily: 'monospace' } })
      emptyLabel.x = W / 2 - 120
      emptyLabel.y = H / 2
      container.addChild(emptyLabel)
    }
  }

  render()

  const btnSpawn = document.getElementById('btn-spawn')
  const btnSave = document.getElementById('btn-save')
  const btnLoad = document.getElementById('btn-load')
  const btnVerify = document.getElementById('btn-verify')

  btnSpawn?.addEventListener('click', spawnDemoState)
  btnSave?.addEventListener('click', saveState)
  btnLoad?.addEventListener('click', loadState)
  btnVerify?.addEventListener('click', verifyRoundTrip)
}
