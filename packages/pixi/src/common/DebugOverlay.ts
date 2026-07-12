import { Container, Text, Application, FederatedPointerEvent, Point } from 'pixi.js'

export interface EntitySnapshot {
  id: number
  [component: string]: any
}

type SnapshotProvider = () => EntitySnapshot[]

export class DebugOverlay {
  private container: Container
  private visible = false
  private bg: Container
  private statsText: Text
  private entityTexts: Text[] = []
  private app: Application
  private getSnapshot: SnapshotProvider
  private inspectMode = false
  private inspectedEntity: EntitySnapshot | null = null
  private inspectText: Text | null = null

  constructor(app: Application, getSnapshot: SnapshotProvider) {
    this.app = app
    this.getSnapshot = getSnapshot
    this.container = new Container()
    this.container.visible = false
    app.stage.addChild(this.container)

    this.bg = new Container()
    this.container.addChild(this.bg)

    this.statsText = new Text({
      text: '',
      style: { fill: 0x00ff00, fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    this.statsText.x = 10
    this.statsText.y = 10
    this.container.addChild(this.statsText)

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault()
        this.toggle()
      }
      if (e.key === 'i' && this.visible) {
        this.inspectMode = !this.inspectMode
        if (!this.inspectMode) this.clearInspect()
      }
    })

    app.stage.eventMode = 'static'
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
      if (!this.visible || !this.inspectMode) return
      const pos = e.client
      const snapshots = this.getSnapshot()
      for (const entity of snapshots) {
        const label = this.findLabel(entity)
        const textObj = this.entityTexts.find(t => t.text?.includes(`#${entity.id}`))
        if (!textObj) continue
        if (pos.x >= textObj.x && pos.x <= textObj.x + textObj.width &&
            pos.y >= textObj.y - 16 && pos.y <= textObj.y + textObj.height - 16) {
          this.showInspect(entity)
          return
        }
      }
    })
  }

  private findLabel(entity: EntitySnapshot): string {
    const label = entity['Label'] as { value?: string } | undefined
    if (label && typeof label.value === 'string') {
      return label.value
    }
    return ''
  }

  private showInspect(entity: EntitySnapshot): void {
    this.inspectedEntity = entity
    if (this.inspectText) {
      this.container.removeChild(this.inspectText)
      this.inspectText.destroy()
    }
    const lines: string[] = [`Entity #${entity.id} ${this.findLabel(entity)}`]
    for (const key of Object.keys(entity)) {
      if (key === 'id') continue
      const val = entity[key]
      if (val && typeof val === 'object') {
        lines.push(`  ${key}: ${JSON.stringify(val)}`)
      }
    }
    this.inspectText = new Text({
      text: lines.join('\n'),
      style: { fill: 0xffff00, fontSize: 12, fontFamily: 'monospace' },
    })
    this.inspectText.x = this.app.screen.width / 2
    this.inspectText.y = 150
    this.container.addChild(this.inspectText)
  }

  private clearInspect(): void {
    this.inspectedEntity = null
    if (this.inspectText) {
      this.container.removeChild(this.inspectText)
      this.inspectText.destroy()
      this.inspectText = null
    }
  }

  toggle(): void {
    this.visible = !this.visible
    this.container.visible = this.visible
    if (!this.visible) {
      this.inspectMode = false
      this.clearInspect()
    }
  }

  update(): void {
    if (!this.visible) return

    for (const t of this.entityTexts) {
      this.container.removeChild(t)
      t.destroy()
    }
    this.entityTexts = []

    const snapshots = this.getSnapshot()
    const fps = Math.round(this.app.ticker.FPS)
    const modeText = this.inspectMode ? ' [I: ON] Click entity to inspect' : ' [I: OFF]'
    this.statsText.text = `FPS: ${fps}  Entities: ${snapshots.length}  [F12] Toggle${modeText}`

    let y = 40
    for (const entity of snapshots) {
      const label = this.findLabel(entity)
      const lines: string[] = [`#${entity.id} ${label}`]
      for (const key of Object.keys(entity)) {
        if (key === 'id') continue
        const val = entity[key]
        if (val && typeof val === 'object') {
          lines.push(`  ${key}: ${JSON.stringify(val)}`)
        }
      }
      const t = new Text({
        text: lines.join('\n'),
        style: { fill: 0xcccccc, fontSize: 11, fontFamily: 'monospace' },
      })
      t.x = 10
      t.y = y
      this.container.addChild(t)
      this.entityTexts.push(t)
      y += t.height + 6

      if (y > this.app.screen.height - 30) break
    }
  }
}
