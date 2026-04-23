/**
 * Downloads the O*NET Education CIP-to-SOC crosswalk XLSX and generates
 * a comprehensive src/data/cipToSocCatalog.json keyed by 4-digit CIP prefix.
 *
 * Usage: node scripts/buildCipToSocCatalog.js
 */
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../src/data/cipToSocCatalog.json')

const XLSX_URL =
  'https://www.onetcenter.org/crosswalks/cip/Education_CIP_to_ONET_SOC.xlsx'

async function downloadXlsx() {
  console.log(`[buildCipToSoc] Downloading ${XLSX_URL} …`)
  const res = await fetch(XLSX_URL)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf)
}

function findColumns(headers) {
  let cipCol = null
  let cipTitleCol = null
  let socCol = null
  let socTitleCol = null

  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] ?? '').toLowerCase().trim()
    if (!cipCol && (h.includes('cip') && h.includes('code'))) cipCol = i
    else if (!cipTitleCol && (h.includes('cip') && h.includes('title'))) cipTitleCol = i
    else if (!socCol && (h.includes('o*net') || h.includes('onet')) && h.includes('soc') && h.includes('code')) socCol = i
    else if (!socTitleCol && (h.includes('o*net') || h.includes('onet')) && h.includes('title')) socTitleCol = i
  }

  if (cipCol == null) cipCol = 0
  if (cipTitleCol == null) cipTitleCol = 1
  if (socCol == null) socCol = 2
  if (socTitleCol == null) socTitleCol = 3

  return { cipCol, cipTitleCol, socCol, socTitleCol }
}

function normalizeCip4(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(0, 4) : null
}

function normalizeSoc(raw) {
  const s = String(raw ?? '').trim()
  return /^\d{2}-\d{4}\.\d{2}$/.test(s) ? s : null
}

async function main() {
  const xlsxBuf = await downloadXlsx()
  const wb = XLSX.read(xlsxBuf, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (rows.length < 2) throw new Error('XLSX has no data rows')

  const headers = rows[0]
  const cols = findColumns(headers)
  console.log(`[buildCipToSoc] Detected columns: CIP=${cols.cipCol}, CIP-title=${cols.cipTitleCol}, SOC=${cols.socCol}`)

  const byCip = {}
  const cipTitles = {}
  let mapped = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const cip4 = normalizeCip4(row[cols.cipCol])
    const soc = normalizeSoc(row[cols.socCol])
    if (!cip4 || !soc) continue

    if (!byCip[cip4]) byCip[cip4] = { title: '', socs: [] }
    if (!byCip[cip4].socs.includes(soc)) byCip[cip4].socs.push(soc)

    const rawTitle = String(row[cols.cipTitleCol] ?? '').trim()
    if (rawTitle && (!cipTitles[cip4] || rawTitle.length > cipTitles[cip4].length)) {
      cipTitles[cip4] = rawTitle
    }
    mapped++
  }

  for (const [cip, title] of Object.entries(cipTitles)) {
    if (byCip[cip]) byCip[cip].title = title
  }

  const output = {
    note: 'Auto-generated from O*NET Education CIP-to-SOC crosswalk XLSX. Re-run scripts/buildCipToSocCatalog.js to refresh.',
    byCip,
  }

  writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8')
  const cipCount = Object.keys(byCip).length
  const socCount = new Set(Object.values(byCip).flatMap((e) => e.socs)).size
  console.log(`[buildCipToSoc] Wrote ${cipCount} CIP-4 entries (${socCount} unique SOCs, ${mapped} total rows) → ${outPath}`)
}

main().catch((err) => {
  console.error('[buildCipToSoc] Failed:', err)
  process.exit(1)
})
