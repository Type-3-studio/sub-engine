import { describe, it, expect } from 'vitest'
import { createRegistry } from '@sub-engine/core'
import { UndoStack } from '@sub-engine/core'

describe('UndoStack', () => {
  it('canUndo returns false initially', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(false)
  })

  it('records and undoes component add', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    const e = registry.createEntity()

    stack.begin()
    registry.addComponent(e as any, 'Position', { x: 10, y: 20 })
    stack.end()

    expect(stack.canUndo()).toBe(true)
    const pos = registry.getComponent(e as any, 'Position') as any
    expect(pos).toBeDefined()
    expect(pos.x).toBe(10)

    stack.undo()
    const posAfter = registry.getComponent(e as any, 'Position') as any
    expect(posAfter).toBeUndefined()
  })

  it('redo restores undone change', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    const e = registry.createEntity()

    stack.begin()
    registry.addComponent(e as any, 'Position', { x: 10, y: 20 })
    stack.end()

    stack.undo()
    expect(registry.getComponent(e as any, 'Position')).toBeUndefined()

    stack.redo()
    const pos = registry.getComponent(e as any, 'Position') as any
    expect(pos).toBeDefined()
    expect(pos.x).toBe(10)
  })

  it('records and undoes component change', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    const e = registry.createEntity()
    registry.addComponent(e as any, 'Position', { x: 0, y: 0 })

    stack.begin()
    registry.addComponent(e as any, 'Position', { x: 99, y: 50 })
    stack.end()

    stack.undo()
    const pos = registry.getComponent(e as any, 'Position') as any
    expect(pos.x).toBe(0)
    expect(pos.y).toBe(0)
  })

  it('records and undoes component removal', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    const e = registry.createEntity()
    registry.addComponent(e as any, 'Position', { x: 5, y: 5 })
    registry.addComponent(e as any, 'Health', { current: 100, max: 100 })

    stack.begin()
    registry.removeComponent(e as any, 'Health')
    stack.end()

    expect(registry.hasComponent(e as any, 'Health')).toBe(false)

    stack.undo()
    expect(registry.hasComponent(e as any, 'Health')).toBe(true)
    const hp = registry.getComponent(e as any, 'Health') as any
    expect(hp.current).toBe(100)
  })

  it('records and undoes entity removal', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    const e = registry.createEntity()
    registry.addComponent(e as any, 'Position', { x: 1, y: 2 })

    stack.begin()
    registry.removeEntity(e)
    stack.end()

    expect(registry.entityExists(e)).toBe(false)

    stack.undo()
    expect(registry.entityExists(e)).toBe(true)
    const pos = registry.getComponent(e as any, 'Position') as any
    expect(pos.x).toBe(1)
    expect(pos.y).toBe(2)
  })

  it('clears stacks', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    const e = registry.createEntity()

    stack.begin()
    registry.addComponent(e as any, 'Position', { x: 10, y: 20 })
    stack.end()

    expect(stack.canUndo()).toBe(true)
    stack.clear()
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(false)
  })

  it('does not record if no changes in batch', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)

    stack.begin()
    stack.end()

    expect(stack.canUndo()).toBe(false)
  })

  it('multiple undos work in sequence', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    const e = registry.createEntity()

    stack.begin()
    registry.addComponent(e as any, 'Position', { x: 1, y: 2 })
    stack.end()

    stack.begin()
    registry.addComponent(e as any, 'Velocity', { x: 3, y: 4 })
    stack.end()

    expect(stack.getUndoCount()).toBe(2)

    stack.undo()
    expect(registry.hasComponent(e as any, 'Velocity')).toBe(false)
    expect(registry.hasComponent(e as any, 'Position')).toBe(true)

    stack.undo()
    expect(registry.hasComponent(e as any, 'Position')).toBe(false)
  })

  it('redo stack clears after new change', () => {
    const registry = createRegistry()
    const stack = new UndoStack(registry)
    const e = registry.createEntity()

    stack.begin()
    registry.addComponent(e as any, 'Position', { x: 10, y: 20 })
    stack.end()

    stack.undo()
    expect(stack.canRedo()).toBe(true)

    stack.begin()
    registry.addComponent(e as any, 'Health', { current: 50, max: 50 })
    stack.end()

    expect(stack.canRedo()).toBe(false)
  })
})
