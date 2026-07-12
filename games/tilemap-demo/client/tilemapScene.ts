import { Graphics, Text, FederatedPointerEvent } from 'pixi.js'
import { createRegistry, loadTiledMap, tiledMapToGameMap, computeFlowField } from '@sub-engine/core'
import { createResponsiveContainer, createTiledMapRenderer, createProceduralMap } from '@sub-engine/pixi'
import { SCHEMA } from '../game/contract.js'
import { MAP_COLS, MAP_ROWS, TILE_SIZE, RENDER_SCALE, RENDER_TILE, GAME_WIDTH, GAME_HEIGHT, TILED_MAP_URL, GroundTile, TileGID } from '../game/config/tilemap.js'
import type { TilemapComponents } from '../game/contract.js'
import type { TiledTilesetRef } from '@sub-engine/core'

function buildEmptyGameMap(): ReturnType<typeof tiledMapToGameMap> {
  return tiledMapToGameMap({
    width: MAP_COLS, height: MAP_ROWS, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE,
    layers: [{ name: 'ground', data: new Array(MAP_COLS * MAP_ROWS).fill(0), width: MAP_COLS, height: MAP_ROWS, visible: true, opacity: 1 }],
    tilesets: [],
  })
}

export async function createScene(app: import('pixi.js').Application): Promise<void> {
  const container = createResponsiveContainer(app, GAME_WIDTH, GAME_HEIGHT)

  const registry = createRegistry<TilemapComponents>()

  const mapEntity = registry.createEntity()
  registry.addComponent(mapEntity, SCHEMA.GAME_STATE, {
    phase: 'loading', info: 'Loading tilemap...', tileCount: 0,
  })

  const infoText = new Text({
    text: '', style: { fill: 0xffffff, fontSize: 14, fontFamily: 'monospace' },
  })
  infoText.y = 4
  container.addChild(infoText)

  const legendText = new Text({
    text: 'Left-click: cycle tile | Right-click: set flow target | F: flow overlay | R: reload | P: procedural',
    style: { fill: 0x888888, fontSize: 11, fontFamily: 'monospace' },
  })
  legendText.y = GAME_HEIGHT - 16
  container.addChild(legendText)

  let tiledMapRenderer: Awaited<ReturnType<typeof createTiledMapRenderer>> | null = null
  const overlayContainer = new Graphics()
  container.addChild(overlayContainer)

  let showFlowField = false
  let flowTargetX = MAP_COLS - 1
  let flowTargetY = MAP_ROWS - 1
  let gameMap = buildEmptyGameMap()

  async function setMapFromData(tiledMap: Parameters<typeof createTiledMapRenderer>[0]): Promise<void> {
    registry.addComponent(mapEntity, SCHEMA.TILE_MAP, tiledMap)

    if (tiledMapRenderer) {
      tiledMapRenderer.destroy()
    }

    tiledMapRenderer = await createTiledMapRenderer(tiledMap, RENDER_SCALE)
    container.addChildAt(tiledMapRenderer.container, 0)

    gameMap = tiledMapToGameMap(tiledMap)

    const tileCount = tiledMap.layers.reduce((s, l) => s + l.data.filter(g => g > 0).length, 0)
    registry.addComponent(mapEntity, SCHEMA.GAME_STATE, {
      phase: 'loaded',
      info: `${tiledMap.width}x${tiledMap.height}, ${tiledMap.layers.length} layers, ${tiledMap.tilesets.length} tilesets`,
      tileCount,
    })
    infoText.text = `Map loaded: ${tiledMap.width}x${tiledMap.height} | Tiles: ${tileCount}`
    drawOverlay()
  }

  function generateProceduralMap(): void {
    const data: number[] = []
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (x === 0 || y === 0 || x === MAP_COLS - 1 || y === MAP_ROWS - 1) {
          data.push(GroundTile.GRASS_01)
        } else if (x === 1 && y === 1) {
          data.push(GroundTile.FLOWERS_01)
        } else if (x === MAP_COLS - 2 && y === MAP_ROWS - 2) {
          data.push(GroundTile.SAND_01)
        } else if (x >= 4 && x <= 7 && y >= 3 && y <= 5) {
          data.push(GroundTile.WATER_01)
        } else if ((x + y) % 3 === 0) {
          data.push(GroundTile.DIRT_01)
        } else {
          data.push(GroundTile.GRASS_01)
        }
      }
    }

    const procMap = {
      width: MAP_COLS, height: MAP_ROWS, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE,
      layers: [{ name: 'ground', data, width: MAP_COLS, height: MAP_ROWS, visible: true, opacity: 1 }],
      tilesets: [] as TiledTilesetRef[],
    }

    setMapFromData(procMap).then(() => {
      infoText.text = `Procedural map | ${MAP_COLS}x${MAP_ROWS}`
    })
  }

  async function loadTiledMapFromUrl(url: string): Promise<void> {
    try {
      infoText.text = 'Loading Tiled map...'
      const tiledMap = await loadTiledMap(url)
      await setMapFromData(tiledMap)
    } catch (err) {
      infoText.text = `Error: ${err instanceof Error ? err.message : String(err)}`
      console.error('Failed to load Tiled map:', err)
    }
  }

  function findWalkableCell(): { x: number; y: number } | null {
    for (let y = 0; y < gameMap.height; y++) {
      for (let x = 0; x < gameMap.width; x++) {
        if (gameMap.isWalkable(x, y)) return { x, y }
      }
    }
    return null
  }

  function drawOverlay(): void {
    overlayContainer.clear()
    if (!showFlowField) return

    let targetX = flowTargetX
    let targetY = flowTargetY
    if (!gameMap.isWalkable(targetX, targetY)) {
      const fallback = findWalkableCell()
      if (!fallback) return
      targetX = fallback.x
      targetY = fallback.y
    }
    const flowField = computeFlowField(gameMap, targetX, targetY)

    for (let y = 0; y < gameMap.height; y++) {
      for (let x = 0; x < gameMap.width; x++) {
        if (!gameMap.isWalkable(x, y)) {
          overlayContainer.fill({ color: 0xff0000, alpha: 0.25 })
          overlayContainer.rect(x * RENDER_TILE, y * RENDER_TILE, RENDER_TILE, RENDER_TILE)
          overlayContainer.fill()
          continue
        }

        const cost = flowField.getCost(x, y)
        const intensity = Math.min(1, cost / 20)
        const r = Math.floor(intensity * 60)
        const g = Math.floor(40 + (1 - intensity) * 80)
        const b = Math.floor(80 + (1 - intensity) * 120)
        overlayContainer.fill({ color: (r << 16) | (g << 8) | b, alpha: 0.25 })
        overlayContainer.rect(x * RENDER_TILE, y * RENDER_TILE, RENDER_TILE, RENDER_TILE)
        overlayContainer.fill()

        const v = flowField.getVector(x, y)
        if (v.x !== 0 || v.y !== 0) {
          const cx = x * RENDER_TILE + RENDER_TILE / 2
          const cy = y * RENDER_TILE + RENDER_TILE / 2
          overlayContainer.stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
          overlayContainer.moveTo(cx, cy)
          overlayContainer.lineTo(cx + v.x * RENDER_TILE * 0.35, cy + v.y * RENDER_TILE * 0.35)
          overlayContainer.stroke()
        }
      }
    }

    overlayContainer.fill({ color: 0xffff44, alpha: 0.8 })
    overlayContainer.circle(targetX * RENDER_TILE + RENDER_TILE / 2, targetY * RENDER_TILE + RENDER_TILE / 2, 8)
    overlayContainer.fill()
  }

  function handleClick(e: FederatedPointerEvent): void {
    const local = container.toLocal(e.global)
    const gx = Math.floor(local.x / RENDER_TILE)
    const gy = Math.floor(local.y / RENDER_TILE)
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return

    if (e.button === 2) {
      flowTargetX = gx
      flowTargetY = gy
      drawOverlay()
      return
    }

    const mapData = registry.getComponent(mapEntity, SCHEMA.TILE_MAP)
    if (!mapData) return
    const groundLayer = mapData.layers[0]
    if (!groundLayer) return

    const idx = gy * mapData.width + gx
    const currentGid: number = groundLayer.data[idx] ?? 0

    const cycleOrder: number[] = [
      TileGID.EMPTY, GroundTile.GRASS_01, GroundTile.DIRT_01,
      GroundTile.PATH_01, GroundTile.SAND_01, GroundTile.WATER_01, GroundTile.FLOWERS_01,
    ]
    const nextIdx = (cycleOrder.indexOf(currentGid) + 1) % cycleOrder.length
    groundLayer.data[idx] = cycleOrder[nextIdx]!

    const newMapData = { ...mapData, layers: [groundLayer, ...mapData.layers.slice(1)] }
    registry.addComponent(mapEntity, SCHEMA.TILE_MAP, newMapData)

    if (tiledMapRenderer) {
      tiledMapRenderer.destroy()
      tiledMapRenderer = null
    }
    createTiledMapRenderer(newMapData, RENDER_SCALE).then(renderer => {
      tiledMapRenderer = renderer
      container.addChildAt(renderer.container, 0)
    })

    gameMap = tiledMapToGameMap(newMapData)
    drawOverlay()
  }

  app.stage.eventMode = 'static'
  app.stage.on('pointerdown', handleClick)
  app.canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault())

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'f' || e.key === 'F') {
      showFlowField = !showFlowField
      drawOverlay()
    }
    if (e.key === 'r' || e.key === 'R') {
      loadTiledMapFromUrl(TILED_MAP_URL)
    }
    if (e.key === 'p' || e.key === 'P') {
      generateProceduralMap()
    }
  })

  generateProceduralMap()

  loadTiledMapFromUrl(TILED_MAP_URL)
}
