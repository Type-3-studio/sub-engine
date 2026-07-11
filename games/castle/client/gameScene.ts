import { Container, Graphics, Text, Application } from 'pixi.js'
import { createRegistry } from '../../../src/engine/index.js'
import { SCHEMA } from '../game/contract.js'
import type { CastleComponents } from '../game/contract.js'
import type { Registry } from '../../../src/engine/types.js'
import { castleSystem } from '../game/systems/CastleSystem.js'
import {
  BUILDING_DEFS, BUILDING_LAYOUT, MAP_W, MAP_H, DAY_LENGTH,
  STARTING_POPULATION, STARTING_FOOD, STARTING_GOLD, STARTING_TAX_RATE,
  BUILDING_W, BUILDING_H, RECRUIT_GOLD_COST,
} from '../game/config/castle.js'
import type { BuildingDef } from '../game/config/castle.js'

const PERSON_SPEED = 0.4

interface VisualEntry {
  container: Container
  prevX: number
  prevY: number
  curX: number
  curY: number
  first: boolean
}

interface BuildingVisual {
  container: Container
  level: number
}

interface UIHandle {
  update(state: CastleComponents['GameState'] | null): void
}

export function createGameScene(container: Container, app: Application, gameW: number, gameH: number) {
  const registry: Registry<CastleComponents> = createRegistry<CastleComponents>()
  const TICK_INTERVAL = 16

  const peopleVisuals = new Map<number, VisualEntry>()
  const buildingVisuals = new Map<number, BuildingVisual>()
  const mapLayer = new Container()
  const buildingLayer = new Container()
  const entityLayer = new Container()
  const overlayLayer = new Container()

  container.addChild(mapLayer)
  container.addChild(buildingLayer)
  container.addChild(entityLayer)
  container.addChild(overlayLayer)

  let uiRef: UIHandle | null = null
  let tickCount = 0
  let running = true
  let tickAcc = 0

  function initGameState(): void {
    const gsId = registry.createEntity()
    registry.addComponent(gsId, SCHEMA.GAME_STATE, {
      population: STARTING_POPULATION,
      maxPopulation: 0,
      soldiers: 0,
      maxSoldiers: 0,
      happiness: 60,
      food: STARTING_FOOD,
      gold: STARTING_GOLD,
      taxRate: STARTING_TAX_RATE,
      foodRations: 1,
      day: 0,
      workers: 0,
      farmWorkers: 0,
      mineWorkers: 0,
      foodProduction: 0,
      foodConsumption: 0,
      goldMining: 0,
      taxGold: 0,
      starved: false,
      totalFarmWorkerSlots: 0,
      totalMineWorkerSlots: 0,
    })
  }

  function createBuildings(): void {
    for (const l of BUILDING_LAYOUT) {
      const eId = registry.createEntity()
      registry.addComponent(eId, SCHEMA.BUILDING, { type: l.type, level: 1 })
      registry.addComponent(eId, SCHEMA.POSITION, { x: l.x, y: l.y })
    }
  }

  function randomBuildingPos(): { x: number; y: number } {
    const l = BUILDING_LAYOUT[Math.floor(Math.random() * BUILDING_LAYOUT.length)]!
    return { x: l.x + (Math.random() - 0.5) * 16, y: l.y + (Math.random() - 0.5) * 16 }
  }

  function spawnPeople(count: number): void {
    for (let i = 0; i < count; i++) {
      const eId = registry.createEntity()
      const bx = 320 + (Math.random() - 0.5) * 80
      const by = 205 + (Math.random() - 0.5) * 60
      registry.addComponent(eId, SCHEMA.POSITION, { x: bx, y: by })
      const target = randomBuildingPos()
      registry.addComponent(eId, SCHEMA.PERSON, {
        targetX: target.x, targetY: target.y,
        speed: PERSON_SPEED + Math.random() * 0.2,
        state: 'walking', idleTimer: 0,
      })
    }
  }

  function drawMap(): void {
    const bg = new Graphics()
    bg.rect(0, 0, MAP_W, MAP_H)
    bg.fill(0x3a7a3a)
    mapLayer.addChild(bg)

    const roadG = new Graphics()
    roadG.moveTo(360, 308)
    roadG.lineTo(360, 570)
    roadG.stroke({ color: 0x8B7355, width: 10, alpha: 0.5 })

    roadG.moveTo(180, 195)
    roadG.lineTo(360, 308)
    roadG.moveTo(540, 195)
    roadG.lineTo(360, 308)
    roadG.moveTo(112, 510)
    roadG.lineTo(360, 570)
    roadG.moveTo(608, 510)
    roadG.lineTo(360, 570)
    roadG.moveTo(112, 120)
    roadG.lineTo(360, 308)
    roadG.moveTo(608, 120)
    roadG.lineTo(360, 308)
    roadG.moveTo(225, 375)
    roadG.lineTo(360, 308)
    roadG.moveTo(495, 375)
    roadG.lineTo(360, 308)
    roadG.stroke({ color: 0x8B7355, width: 6, alpha: 0.4 })
    mapLayer.addChild(roadG)
  }

  function defForType(type: string): BuildingDef | undefined {
    return BUILDING_DEFS.find(d => d.type === type)
  }

  function createBuildingVisual(eId: number, buildingComp: CastleComponents['Building'], pos: CastleComponents['Position']): Container | null {
    const def = defForType(buildingComp.type)
    if (!def) return null

    const c = new Container()
    const halfW = BUILDING_W / 2
    const halfH = BUILDING_H / 2

    const body = new Graphics()
    body.rect(-halfW, -halfH, BUILDING_W, BUILDING_H)
    body.fill(def.color)
    body.rect(-halfW, -halfH, BUILDING_W, BUILDING_H)
    body.stroke({ color: 0x222222, width: 2 })
    c.addChild(body)

    const roof = new Graphics()
    roof.poly([-halfW - 4, -halfH, 0, -halfH - 14, halfW + 4, -halfH])
    roof.fill(def.roofColor)
    c.addChild(roof)

    const label = new Text({
      text: def.label,
      style: { fill: 0xffffff, fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    label.anchor = { x: 0.5, y: 0.5 }
    label.y = 2
    c.addChild(label)

    const lvText = new Text({
      text: `Lv ${buildingComp.level}`,
      style: { fill: 0xffdd44, fontSize: 8, fontFamily: 'monospace' },
    })
    lvText.anchor = { x: 0.5, y: 0.5 }
    lvText.y = 16
    c.addChild(lvText)

    c.x = pos.x
    c.y = pos.y
    buildingLayer.addChild(c)
    return c
  }

  function syncBuildings(): void {
    const all = registry.getAllEntities()
    const active = new Set<number>()
    for (const e of all) {
      if (!e.Building || !e.Position) continue
      active.add(e.id)
      if (buildingVisuals.has(e.id)) {
        const existing = buildingVisuals.get(e.id)!
        if (existing.level !== e.Building.level) {
          buildingLayer.removeChild(existing.container)
          existing.container.destroy({ children: true })
          buildingVisuals.delete(e.id)
          const vis = createBuildingVisual(e.id, e.Building, e.Position)
          if (vis) buildingVisuals.set(e.id, { container: vis, level: e.Building.level })
        }
      } else {
        const vis = createBuildingVisual(e.id, e.Building, e.Position)
        if (vis) buildingVisuals.set(e.id, { container: vis, level: e.Building.level })
      }
    }
    for (const [id, bv] of buildingVisuals) {
      if (!active.has(id)) {
        buildingLayer.removeChild(bv.container)
        buildingVisuals.delete(id)
      }
    }
  }

  function syncPeople(): void {
    const all = registry.getAllEntities()
    const active = new Set<number>()
    for (const e of all) {
      if (!e.Person || !e.Position) continue
      active.add(e.id)
      let entry = peopleVisuals.get(e.id)
      if (!entry) {
        const c = new Container()
        const gfx = new Graphics()
        gfx.circle(0, 0, 4)
        gfx.fill(0x88CCFF)
        gfx.circle(0, 0, 4)
        gfx.stroke({ color: 0x5599CC, width: 1 })
        c.addChild(gfx)
        c.x = e.Position.x
        c.y = e.Position.y
        entityLayer.addChild(c)
        entry = {
          container: c,
          prevX: e.Position.x,
          prevY: e.Position.y,
          curX: e.Position.x,
          curY: e.Position.y,
          first: true,
        }
        peopleVisuals.set(e.id, entry)
      }
      if (entry.first) {
        entry.prevX = e.Position.x
        entry.prevY = e.Position.y
        entry.curX = e.Position.x
        entry.curY = e.Position.y
        entry.first = false
      } else {
        entry.prevX = entry.curX
        entry.prevY = entry.curY
        entry.curX = e.Position.x
        entry.curY = e.Position.y
      }
    }
    for (const [id, entry] of peopleVisuals) {
      if (!active.has(id)) {
        entityLayer.removeChild(entry.container)
        peopleVisuals.delete(id)
      }
    }
  }

  function render(alpha: number): void {
    for (const [, entry] of peopleVisuals) {
      entry.container.x = entry.prevX + (entry.curX - entry.prevX) * alpha
      entry.container.y = entry.prevY + (entry.curY - entry.prevY) * alpha
    }
  }

  function movePeople(): void {
    const people = registry.getEntitiesWith([SCHEMA.PERSON, SCHEMA.POSITION])
    for (const p of people) {
      const person = p.Person
      const pos = p.Position
      if (person.state === 'idle') {
        person.idleTimer--
        if (person.idleTimer <= 0) {
          const t = randomBuildingPos()
          registry.addComponent(p.id, SCHEMA.PERSON, { ...person, targetX: t.x, targetY: t.y, state: 'walking', idleTimer: 0 })
        }
        continue
      }
      const dx = person.targetX - pos.x
      const dy = person.targetY - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 3) {
        registry.addComponent(p.id, SCHEMA.PERSON, { ...person, state: 'idle', idleTimer: 80 + Math.floor(Math.random() * 140) })
      } else {
        const step = Math.min(person.speed, dist)
        registry.addComponent(p.id, SCHEMA.POSITION, {
          x: pos.x + (dx / dist) * step,
          y: pos.y + (dy / dist) * step,
        })
      }
    }
  }

  function getState(): CastleComponents['GameState'] | null {
    const st = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    return st.length ? st[0]!.GameState : null
  }

  function tick(): void {
    if (!running) return
    tickCount++
    movePeople()
    if (tickCount % DAY_LENGTH === 0) {
      castleSystem(registry)
      syncBuildings()
      uiRef?.update(getState())
    }
  }

  initGameState()
  createBuildings()
  spawnPeople(STARTING_POPULATION)
  castleSystem(registry)
  drawMap()
  syncBuildings()
  syncPeople()

  let lastT = performance.now()
  function loop(t: number): void {
    const dt = t - lastT
    lastT = t
    tickAcc += dt
    while (tickAcc >= TICK_INTERVAL) {
      tick()
      tickAcc -= TICK_INTERVAL
    }
    render(tickAcc / TICK_INTERVAL)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  const gameInterface = {
    getState,
    upgradeType(type: string): boolean {
      const gs = registry.getEntitiesWith([SCHEMA.GAME_STATE])
      if (!gs.length) return false
      const gsId = gs[0]!.id
      const state = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      if (!state) return false
      const def = defForType(type)
      if (!def) return false
      const buildings = registry.getEntitiesWith([SCHEMA.BUILDING])
      const typeBuildings = buildings.filter(b => b.Building.type === type)
      if (!typeBuildings.length) return false
      const currentLevel = typeBuildings[0]!.Building.level
      if (currentLevel >= 3) return false
      const cost = def.upgradeCosts[currentLevel]!
      if (state.gold < cost) return false
      registry.addComponent(gsId, SCHEMA.GAME_STATE, { ...state, gold: Math.round((state.gold - cost) * 10) / 10 })
      for (const b of typeBuildings) {
        registry.addComponent(b.id, SCHEMA.BUILDING, { ...b.Building, level: currentLevel + 1 })
      }
      syncBuildings()
      const newState = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      uiRef?.update(newState ?? null)
      return true
    },
    recruitSoldier(): boolean {
      const gs = registry.getEntitiesWith([SCHEMA.GAME_STATE])
      if (!gs.length) return false
      const gsId = gs[0]!.id
      const state = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      if (!state) return false
      if (state.soldiers >= state.maxSoldiers) return false
      if (state.population <= state.soldiers + 1) return false
      if (state.gold < RECRUIT_GOLD_COST) return false
      registry.addComponent(gsId, SCHEMA.GAME_STATE, {
        ...state,
        soldiers: state.soldiers + 1,
        gold: Math.round((state.gold - RECRUIT_GOLD_COST) * 10) / 10,
      })
      const newState = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      uiRef?.update(newState ?? null)
      return true
    },
    dismissSoldier(): boolean {
      const gs = registry.getEntitiesWith([SCHEMA.GAME_STATE])
      if (!gs.length) return false
      const gsId = gs[0]!.id
      const state = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      if (!state) return false
      if (state.soldiers <= 0) return false
      registry.addComponent(gsId, SCHEMA.GAME_STATE, { ...state, soldiers: state.soldiers - 1 })
      const newState = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      uiRef?.update(newState ?? null)
      return true
    },
    changeTaxRate(delta: number): void {
      const gs = registry.getEntitiesWith([SCHEMA.GAME_STATE])
      if (!gs.length) return
      const gsId = gs[0]!.id
      const state = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      if (!state) return
      const newRate = Math.max(0, Math.min(50, state.taxRate + delta))
      registry.addComponent(gsId, SCHEMA.GAME_STATE, { ...state, taxRate: newRate })
      const newState = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      uiRef?.update(newState ?? null)
    },
    changeRations(level: number): void {
      const gs = registry.getEntitiesWith([SCHEMA.GAME_STATE])
      if (!gs.length) return
      const gsId = gs[0]!.id
      const state = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      if (!state) return
      registry.addComponent(gsId, SCHEMA.GAME_STATE, { ...state, foodRations: Math.max(0, Math.min(2, level)) })
      const newState = registry.getComponent(gsId, SCHEMA.GAME_STATE)
      uiRef?.update(newState ?? null)
    },
    getBuildingLevel(type: string): number {
      const buildings = registry.getEntitiesWith([SCHEMA.BUILDING])
      const tb = buildings.filter(b => b.Building.type === type)
      return tb.length ? tb[0]!.Building.level : 1
    },
    setUI(ui: UIHandle): void { uiRef = ui },
  }

  return gameInterface
}
