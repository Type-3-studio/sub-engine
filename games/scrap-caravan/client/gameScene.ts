import { Container, Graphics, Application } from 'pixi.js'
import { createRegistry, createEntity, movementSystem, createGameLoop } from '@sub-engine/core'
import { createEntityRenderer, createInspector } from '@sub-engine/pixi'
import type { Registry } from '@sub-engine/core'
import { SCHEMA } from '../game/contract.js'
import type { ScrapCaravanComponents } from '../game/contract.js'
import { economySystem, getEconomyState, spendResource } from '../game/systems/EconomySystem.js'
import { miningSystem } from '../game/systems/MiningSystem.js'
import { droneSystem } from '../game/systems/DroneSystem.js'
import { combatSystem } from '../game/systems/CombatSystem.js'
import { weatherSystem } from '../game/systems/WeatherSystem.js'
import { waveSystem, startWave, getWaveState } from '../game/systems/WaveSystem.js'
import {
  MAP_COLS, MAP_ROWS, TILE_SIZE, GRID_W, GRID_H, HUD_H,
  RESOURCE_DEPOSITS, WALL_TILES, STORAGE_X, STORAGE_Y,
  DRONE_CARGO_CAPACITY, DRONE_MAX_CARGO_SLOTS,
  CRAWLER_DAMAGE, CRAWLER_RANGE, CRAWLER_FIRE_RATE,
  CRAWLER_COST_SILICON, CRAWLER_COST_IRON, CRAWLER_COST_COPPER,
} from '../game/config.js'
import { createEntityVisual } from './renderer.js'
import type { EconomyState } from '../game/systems/EconomySystem.js'

const MAP_OFFSET_Y = HUD_H

export interface UIHandle {
  update(state: EconomyState | null, waveInfo: { wave: number; phase: string }): void
}

export function createGameScene(container: Container, app: Application) {
  const registry: Registry<ScrapCaravanComponents> = createRegistry<ScrapCaravanComponents>()
  const TICK_INTERVAL = 16

  const mapLayer = new Container()
  const scrapLayer = new Container()
  const entityLayer = new Container()
  const overlayLayer = new Container()
  const stormLayer = new Container()

  mapLayer.y = MAP_OFFSET_Y
  scrapLayer.y = MAP_OFFSET_Y
  entityLayer.y = MAP_OFFSET_Y
  overlayLayer.y = MAP_OFFSET_Y
  stormLayer.y = MAP_OFFSET_Y

  container.addChild(mapLayer)
  container.addChild(scrapLayer)
  container.addChild(entityLayer)
  container.addChild(stormLayer)
  container.addChild(overlayLayer)

  let uiRef: UIHandle | null = null

  const entityRenderer = createEntityRenderer(entityLayer, (e: any) => createEntityVisual(e), {
    snapToGrid: true,
    gridSize: TILE_SIZE,
    interactive: true,
  })

  const scrapRenderer = createEntityRenderer(scrapLayer, (e: any) => createEntityVisual(e), {
    snapToGrid: true,
    gridSize: TILE_SIZE,
  })

  function drawMap(): void {
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const cell = new Graphics()
        const isWall = WALL_TILES.some(w => w.x === x && w.y === y)
        if (isWall) {
          cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          cell.fill(0x444466)
          cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          cell.stroke({ color: 0x555577, width: 1 })
        } else {
          const shade = ((x + y) % 2 === 0) ? 0x1a1a2e : 0x16162a
          cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          cell.fill(shade)
          cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          cell.stroke({ color: 0x222244, width: 1 })
        }
        mapLayer.addChild(cell)
      }
    }
  }

  function setupScene(): void {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: STORAGE_X + 0.5, y: STORAGE_Y + 0.5 },
      [SCHEMA.ECONOMY_STORAGE]: { balances: { silicon: 0, iron: 20, copper: 0 } },
      [SCHEMA.LABEL]: { value: 'storage' },
    })

    for (const dep of RESOURCE_DEPOSITS) {
      createEntity(registry, {
        [SCHEMA.POSITION]: { x: dep.x + 0.5, y: dep.y + 0.5 },
        [SCHEMA.SCRAP_NODE]: { resourceType: dep.type, remainingUnits: dep.units, maxUnits: dep.units },
        [SCHEMA.LABEL]: { value: 'scrap-node' },
      })
    }

    const dronePositions = [
      { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 7 },
    ]
    for (const pos of dronePositions) {
      createEntity(registry, {
        [SCHEMA.POSITION]: { x: pos.x + 0.5, y: pos.y + 0.5 },
        [SCHEMA.VELOCITY]: { x: 0, y: 0 },
        [SCHEMA.HEALTH]: { current: 30, max: 30 },
        [SCHEMA.DRONE_AI]: {
          state: 'idle',
          targetNodeId: null,
          cargo: [],
          maxCargo: DRONE_MAX_CARGO_SLOTS,
          cargoCapacity: DRONE_CARGO_CAPACITY,
        },
        [SCHEMA.INVENTORY]: { slots: [], maxWeight: DRONE_CARGO_CAPACITY, assignedCollectorId: null },
        [SCHEMA.LABEL]: { value: 'drone' },
      })
    }

    const crawlerPositions = [
      { x: 2, y: 9 }, { x: 6, y: 9 },
    ]
    for (const pos of crawlerPositions) {
      createEntity(registry, {
        [SCHEMA.POSITION]: { x: pos.x + 0.5, y: pos.y + 0.5 },
        [SCHEMA.HEALTH]: { current: 80, max: 80 },
        [SCHEMA.CRAWLER]: { damage: CRAWLER_DAMAGE, range: CRAWLER_RANGE, fireRate: CRAWLER_FIRE_RATE, cooldown: 0 },
        [SCHEMA.COMPOSITE_VISUAL]: { baseAsset: 'crawler-chassis', attachmentAsset: 'crawler-turret', rotationOffset: 0 },
        [SCHEMA.LABEL]: { value: 'crawler' },
      })
    }
  }

  function getState(): EconomyState | null {
    return getEconomyState(registry)
  }

  function getSnapshot(): Array<{ id: number; [key: string]: any }> {
    return registry.getAllEntities()
  }

  function buildCrawler(): void {
    if (!spendResource(registry, 'silicon', CRAWLER_COST_SILICON)) return
    if (!spendResource(registry, 'iron', CRAWLER_COST_IRON)) return
    if (!spendResource(registry, 'copper', CRAWLER_COST_COPPER)) return

    const crawlers = registry.getEntitiesWith([SCHEMA.CRAWLER])
    const offset = crawlers.length % 4
    const spawnX = 2 + offset * 2
    const spawnY = 10

    createEntity(registry, {
      [SCHEMA.POSITION]: { x: spawnX + 0.5, y: spawnY + 0.5 },
      [SCHEMA.HEALTH]: { current: 80, max: 80 },
      [SCHEMA.CRAWLER]: { damage: CRAWLER_DAMAGE, range: CRAWLER_RANGE, fireRate: CRAWLER_FIRE_RATE, cooldown: 0 },
      [SCHEMA.COMPOSITE_VISUAL]: { baseAsset: 'crawler-chassis', attachmentAsset: 'crawler-turret', rotationOffset: 0 },
      [SCHEMA.LABEL]: { value: 'crawler' },
    })
  }

  function tick(): void {
    economySystem(registry)
    droneSystem(registry, TICK_INTERVAL)
    movementSystem(registry, TICK_INTERVAL)
    miningSystem(registry, TICK_INTERVAL)
    combatSystem(registry, TICK_INTERVAL)
    weatherSystem(registry, TICK_INTERVAL)
    waveSystem(registry, TICK_INTERVAL)

    const all = registry.getAllEntities()
    entityRenderer.sync(all)
    const scrapNodes = all.filter(e => (e as any).Label?.value === 'scrap-node')
    scrapRenderer.sync(scrapNodes)
  }

  drawMap()
  setupScene()

  setTimeout(() => {
    startWave(registry, 0)
  }, 3000)

  const initial = registry.getAllEntities()
  entityRenderer.sync(initial)
  scrapRenderer.sync(initial.filter(e => (e as any).Label?.value === 'scrap-node'))

  const inspector = createInspector({
    getSnapshot: () => registry.getAllEntities() as any,
    panelWidth: 360,
    panelHeight: 480,
  })

  entityRenderer.onEntityClick((entityId) => {
    inspector.handleEntityClick(entityId)
  })

  const gameLoop = createGameLoop({
    tickRate: 1000 / TICK_INTERVAL,
    maxFrameMs: 100,
    onStep: tick,
    onFrame(alpha: number) {
      entityRenderer.render(alpha)
      scrapRenderer.render(alpha)

      const state = getEconomyState(registry)
      const waveInfo = getWaveState(registry)
      uiRef?.update(state, waveInfo)

      if (inspector.isVisible()) {
        inspector.update()
      }
    },
  })
  gameLoop.start()

  return {
    getState,
    getSnapshot,
    startWave() { const wi = getWaveState(registry); if (wi.phase === 'idle') startWave(registry, wi.wave) },
    buildCrawler,
    setUI(ui: UIHandle) { uiRef = ui },
    togglePause() {
      if (gameLoop.isPaused()) {
        gameLoop.resume()
      } else {
        gameLoop.pause()
      }
    },
  }
}
