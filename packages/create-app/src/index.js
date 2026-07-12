#!/usr/bin/env node
import { existsSync, cpSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const templateDir = resolve(__dirname, '..', 'template')

const projectName = process.argv[2] || '.'
const targetDir = resolve(process.cwd(), projectName)

if (existsSync(targetDir) && projectName !== '.') {
  console.error(`Error: "${projectName}" already exists.`)
  process.exit(1)
}

console.log(`Creating Sub-Engine game in ${targetDir}...`)

cpSync(templateDir, targetDir, { recursive: true })

// Update package.json name
const pkgPath = resolve(targetDir, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
pkg.name = projectName === '.' ? 'my-game' : projectName
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log(`
Done! Next steps:

  cd ${projectName}
  npm install
  npm run dev

Edit src/game/contract.ts to define your components.
`)
