import type { Registry, ComponentMap, SerializedRegistry } from '../engine/types.js'

export class UndoStack<M extends ComponentMap = Record<string, any>> {
  private undoStack: { before: SerializedRegistry; after: SerializedRegistry }[] = []
  private redoStack: { before: SerializedRegistry; after: SerializedRegistry }[] = []
  private registry: Registry<M>
  private maxSize: number
  private batchBefore: SerializedRegistry | null = null
  private inBatch = false

  constructor(registry: Registry<M>, maxSize = 50) {
    this.registry = registry
    this.maxSize = maxSize
  }

  begin(): void {
    if (this.inBatch) return
    this.inBatch = true
    this.batchBefore = JSON.parse(JSON.stringify(this.registry.serialize()))
  }

  end(): void {
    if (!this.inBatch) return
    this.inBatch = false
    if (!this.batchBefore) return

    const after = JSON.parse(JSON.stringify(this.registry.serialize()))
    const before = this.batchBefore
    this.batchBefore = null

    const beforeJson = JSON.stringify(before)
    const afterJson = JSON.stringify(after)
    if (beforeJson === afterJson) return

    this.undoStack.push({ before, after })
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  undo(): boolean {
    const entry = this.undoStack.pop()
    if (!entry) return false
    this.redoStack.push(entry)

    const beforeJson = JSON.stringify(entry.before)
    const currentJson = JSON.stringify(this.registry.serialize())
    if (beforeJson !== currentJson) {
      const after = JSON.parse(currentJson)
      this.redoStack[this.redoStack.length - 1]!.after = after
    }

    this.registry.deserialize(JSON.parse(JSON.stringify(entry.before)))
    return true
  }

  redo(): boolean {
    const entry = this.redoStack.pop()
    if (!entry) return false
    this.undoStack.push(entry)
    this.registry.deserialize(JSON.parse(JSON.stringify(entry.after)))
    return true
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.batchBefore = null
    this.inBatch = false
  }

  getUndoCount(): number {
    return this.undoStack.length
  }

  getRedoCount(): number {
    return this.redoStack.length
  }
}
