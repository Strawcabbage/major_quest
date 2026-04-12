/**
 * College Scorecard API client.
 * Dev: requests go through Vite proxy `/api/scorecard` (key injected server-side).
 * Prod: set `VITE_COLLEGE_SCORECARD_API_KEY` or configure your own proxy.
 */

function buildUrl(searchParams) {
  const qs = new URLSearchParams(searchParams)
  if (import.meta.env.DEV) {
    return `/api/scorecard?${qs}`
  }
  const key = import.meta.env.VITE_COLLEGE_SCORECARD_API_KEY
  if (!key) {
    throw new Error(
      'College Scorecard is not configured. Use `npm run dev` with COLLEGE_SCORECARD_API_KEY in .env.local, or set VITE_COLLEGE_SCORECARD_API_KEY for a static build.',
    )
  }
  qs.set('api_key', key)
  return `https://api.data.gov/ed/collegescorecard/v1/schools.json?${qs}`
}

export async function fetchScorecard(params) {
  const url = buildUrl(params)
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Scorecard API ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

const SCHOOL_LIST_FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'latest.admissions.admission_rate.overall',
  'latest.cost.avg_net_price.overall',
].join(',')

const SCHOOL_DETAIL_FIELDS = [
  SCHOOL_LIST_FIELDS,
  'latest.programs.cip_4_digit.code',
  'latest.programs.cip_4_digit.title',
  'latest.programs.cip_4_digit.credential.title',
  'latest.programs.cip_4_digit.credential.level',
  'latest.programs.cip_4_digit.earnings.highest.1_yr.overall_median_earnings',
  'latest.programs.cip_4_digit.earnings.highest.2_yr.overall_median_earnings',
  'latest.programs.cip_4_digit.debt.all.all_inst.median',
  'latest.programs.cip_4_digit.completion.completion_rate_4yr_150nt',
].join(',')

function pick(raw, key) {
  return raw[key]
}

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeSchoolSummary(raw) {
  const id = pick(raw, 'id')
  const admission = pick(raw, 'latest.admissions.admission_rate.overall')
  const net = pick(raw, 'latest.cost.avg_net_price.overall')
  return {
    id,
    name: pick(raw, 'school.name') ?? 'Unknown school',
    city: pick(raw, 'school.city') ?? '',
    state: pick(raw, 'school.state') ?? '',
    admissionRate: typeof admission === 'number' ? admission : null,
    avgNetPrice: typeof net === 'number' ? net : null,
    raw,
  }
}

function programDebtMedian(prog) {
  const direct = prog?.debt?.all?.all_inst?.median
  if (typeof direct === 'number') return direct
  const alt = prog?.debt?.parent_plus?.all?.all_inst?.median
  return typeof alt === 'number' ? alt : null
}

function programEarnings2Yr(prog) {
  const v = prog?.earnings?.highest?.['2_yr']?.overall_median_earnings
  return typeof v === 'number' ? v : null
}

function programEarnings1Yr(prog) {
  const v = prog?.earnings?.highest?.['1_yr']?.overall_median_earnings
  return typeof v === 'number' ? v : null
}

/** Prefer 2-yr cohort for game seed; fall back to 1-yr when 2-yr missing. */
function programEarningsMedian(prog) {
  const y2 = programEarnings2Yr(prog)
  if (y2 != null) return y2
  return programEarnings1Yr(prog)
}

function programCompletionRate(prog) {
  const v = prog?.completion?.completion_rate_4yr_150nt
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v > 1 ? v / 100 : v
  }
  return null
}

function programCredentialLevel(prog) {
  const v = prog?.credential?.level
  return typeof v === 'number' ? v : null
}

/**
 * @param {unknown} prog
 */
export function normalizeProgram(prog) {
  if (!prog || typeof prog !== 'object') return null
  const code = prog.code != null ? String(prog.code).replace(/\D/g, '').slice(0, 4) : ''
  const title =
    prog.title ||
    prog.credential?.title ||
    (code ? `Program ${code}` : 'Program')
  return {
    cipCode: code,
    title,
    earningsMedian: programEarningsMedian(prog),
    earningsMedian1Yr: programEarnings1Yr(prog),
    earningsMedian2Yr: programEarnings2Yr(prog),
    debtMedian: programDebtMedian(prog),
    completionRate: programCompletionRate(prog),
    credentialLevel: programCredentialLevel(prog),
    raw: prog,
  }
}

/**
 * @param {Record<string, unknown>} raw
 */
export function extractPrograms(raw) {
  const list = pick(raw, 'latest.programs.cip_4_digit')
  if (!Array.isArray(list)) return []
  return list.map(normalizeProgram).filter(Boolean)
}

/**
 * Merge Scorecard rows that share the same 4-digit CIP (multiple credential levels).
 * Keeps the best (max) reported earnings median and the longest field title.
 * @param {Array<{ cipCode: string, title: string, earningsMedian: number|null, debtMedian: number|null, raw?: unknown }>} programs
 */
function preferBachelorProgram(a, b) {
  const la = a?.credentialLevel
  const lb = b?.credentialLevel
  if (la === 3 && lb !== 3) return a
  if (lb === 3 && la !== 3) return b
  return b
}

export function dedupeProgramsByCip(programs) {
  if (!Array.isArray(programs) || programs.length === 0) return []
  /** @type {Map<string, object>} */
  const byCip = new Map()
  for (const p of programs) {
    if (!p?.cipCode) continue
    const cip = String(p.cipCode).replace(/\D/g, '').slice(0, 4)
    if (cip.length !== 4) continue
    const existing = byCip.get(cip)
    if (!existing) {
      byCip.set(cip, {
        cipCode: cip,
        title: p.title || `Program ${cip}`,
        earningsMedian: typeof p.earningsMedian === 'number' ? p.earningsMedian : null,
        earningsMedian1Yr: typeof p.earningsMedian1Yr === 'number' ? p.earningsMedian1Yr : null,
        earningsMedian2Yr: typeof p.earningsMedian2Yr === 'number' ? p.earningsMedian2Yr : null,
        debtMedian: typeof p.debtMedian === 'number' ? p.debtMedian : null,
        completionRate: typeof p.completionRate === 'number' ? p.completionRate : null,
        credentialLevel: typeof p.credentialLevel === 'number' ? p.credentialLevel : null,
        raw: p.raw,
      })
      continue
    }
    const titles = [existing.title, p.title].filter(Boolean)
    const bestTitle = titles.reduce((a, b) => (b.length > a.length ? b : a), existing.title)
    const earnCandidates = [existing.earningsMedian, p.earningsMedian].filter((x) => typeof x === 'number')
    const maxEarn = earnCandidates.length ? Math.max(...earnCandidates) : null
    const e1 = [existing.earningsMedian1Yr, p.earningsMedian1Yr].filter((x) => typeof x === 'number')
    const e2 = [existing.earningsMedian2Yr, p.earningsMedian2Yr].filter((x) => typeof x === 'number')
    const debtCandidates = [existing.debtMedian, p.debtMedian].filter((x) => typeof x === 'number')
    const maxDebt = debtCandidates.length ? Math.max(...debtCandidates) : null
    const comp = [existing.completionRate, p.completionRate].filter((x) => typeof x === 'number')
    const bestComp = comp.length ? Math.max(...comp) : null
    const merged = {
      cipCode: cip,
      title: bestTitle,
      earningsMedian: maxEarn,
      earningsMedian1Yr: e1.length ? Math.max(...e1) : null,
      earningsMedian2Yr: e2.length ? Math.max(...e2) : null,
      debtMedian: maxDebt,
      completionRate: bestComp,
      credentialLevel: null,
      raw: preferBachelorProgram(p, existing).raw ?? p.raw ?? existing.raw,
    }
    const cl = [existing.credentialLevel, p.credentialLevel].filter((x) => typeof x === 'number')
    if (cl.includes(3)) merged.credentialLevel = 3
    else if (cl.length) merged.credentialLevel = Math.max(...cl)
    byCip.set(cip, merged)
  }
  return [...byCip.values()].sort((a, b) => a.cipCode.localeCompare(b.cipCode))
}

/** Higher = more fields populated (for surfacing well-documented programs first). */
export function programDataCompletenessScore(p) {
  let s = 0
  if (p?.earningsMedian != null) s += 4
  if (p?.debtMedian != null) s += 2
  if (p?.completionRate != null) s += 1
  return s
}

/**
 * Sort by data completeness, then median earnings (desc), then title.
 * @template T
 * @param {T[]} programs
 * @returns {T[]}
 */
export function rankProgramsForDisplay(programs) {
  if (!Array.isArray(programs)) return []
  return [...programs].sort((a, b) => {
    const ca = programDataCompletenessScore(a)
    const cb = programDataCompletenessScore(b)
    if (cb !== ca) return cb - ca
    const ea = typeof a.earningsMedian === 'number' ? a.earningsMedian : -1
    const eb = typeof b.earningsMedian === 'number' ? b.earningsMedian : -1
    if (eb !== ea) return eb - ea
    return String(a.title ?? '').localeCompare(String(b.title ?? ''))
  })
}

export async function searchSchools(query, page = 0, perPage = 25) {
  const q = query.trim()
  const params = {
    fields: SCHOOL_LIST_FIELDS,
    per_page: String(perPage),
    page: String(page),
  }
  if (q.length >= 2) {
    params['school.search'] = q
  }
  const json = await fetchScorecard(params)
  const results = Array.isArray(json.results) ? json.results.map(normalizeSchoolSummary) : []
  const total = json.metadata?.total ?? results.length
  return { results, total, page, perPage }
}

export async function fetchSchoolById(id) {
  const json = await fetchScorecard({
    id: String(id),
    fields: SCHOOL_DETAIL_FIELDS,
  })
  const raw = json.results?.[0]
  if (!raw) return null
  const base = normalizeSchoolSummary(raw)
  return {
    ...base,
    programs: rankProgramsForDisplay(dedupeProgramsByCip(extractPrograms(raw))),
  }
}
