import { useEffect, useState } from 'react'

let cached = null
let pending = null

function load() {
  if (cached) return Promise.resolve(cached)
  if (!pending) {
    pending = import('../data/careerCatalog.json').then((m) => {
      cached = m.default ?? m
      return cached
    })
  }
  return pending
}

/**
 * Lazily loads careerCatalog.json on first mount.
 * Returns `{ bySoc: {} }` while loading so callers can render immediately.
 */
export function useCareerCatalog() {
  const [catalog, setCatalog] = useState(cached ?? { bySoc: {} })

  useEffect(() => {
    if (cached) { setCatalog(cached); return }
    load().then(setCatalog)
  }, [])

  return catalog
}

/**
 * Preload the catalog in the background (call early to avoid waterfall).
 */
export function preloadCareerCatalog() {
  load()
}
