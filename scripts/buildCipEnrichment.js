/**
 * Offline helper to merge or validate cipEnrichment.json.
 * Full CIP–SOC crosswalk + BLS automation can extend this script later.
 *
 * Usage: node scripts/buildCipEnrichment.js
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const target = join(__dirname, '../src/data/cipEnrichment.json')

const data = JSON.parse(readFileSync(target, 'utf-8'))
if (!data.byCip || typeof data.byCip !== 'object') {
  console.error('cipEnrichment.json must have top-level byCip object')
  process.exit(1)
}

const keys = Object.keys(data.byCip)
for (const k of keys) {
  if (!/^\d{4}$/.test(k)) {
    console.warn(`Non–4-digit CIP key (skipped validation failure): ${k}`)
  }
}

writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
console.log(`Validated ${keys.length} CIP entries → ${target}`)
