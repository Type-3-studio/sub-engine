// CI size budget: keeps the published packages deliberately small.
// Article/motivation: the v1 engine accumulated bloat; v2 must not.
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BUDGET_BYTES = 512 * 1024 // 512 KB across both packages
const DIST_ROOTS = ['packages/core/dist', 'packages/pixi/dist']

function dirSize(dir) {
  if (!existsSync(dir)) return 0
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    total += entry.isDirectory() ? dirSize(path) : statSync(path).size
  }
  return total
}

let total = 0
for (const root of DIST_ROOTS) total += dirSize(root)

const kb = (total / 1024).toFixed(1)
const budgetKb = (BUDGET_BYTES / 1024).toFixed(0)
if (total > BUDGET_BYTES) {
  console.error(`✗ dist size ${kb} KB exceeds the ${budgetKb} KB budget`)
  process.exit(1)
}
console.log(`✓ dist size ${kb} KB (budget ${budgetKb} KB)`)
