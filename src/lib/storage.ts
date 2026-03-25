import type { ApiKeys, GenerationSettings } from '../types'

const KEYS = {
  API_KEYS: 'nside_api_keys',
  SETTINGS: 'nside_gen_settings',
  THEME: 'nside_theme',
  KEYWORD_LISTS: 'nside_keyword_lists',
  HISTORY_CACHE: 'nside_history_cache',
  BATCH_JOBS: 'nside_batch_jobs',
}

export const storage = {
  getApiKeys(): ApiKeys {
    try {
      const stored = localStorage.getItem(KEYS.API_KEYS)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  },

  setApiKeys(keys: ApiKeys): void {
    localStorage.setItem(KEYS.API_KEYS, JSON.stringify(keys))
  },

  getSettings(): GenerationSettings {
    try {
      const stored = localStorage.getItem(KEYS.SETTINGS)
      return stored ? JSON.parse(stored) : defaultSettings()
    } catch {
      return defaultSettings()
    }
  },

  setSettings(settings: GenerationSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
  },

  getTheme(): 'dark' | 'light' {
    return (localStorage.getItem(KEYS.THEME) as 'dark' | 'light') || 'dark'
  },

  setTheme(theme: 'dark' | 'light'): void {
    localStorage.setItem(KEYS.THEME, theme)
  },

  getKeywordLists(): Record<string, string[]> {
    try {
      const stored = localStorage.getItem(KEYS.KEYWORD_LISTS)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  },

  setKeywordLists(lists: Record<string, string[]>): void {
    localStorage.setItem(KEYS.KEYWORD_LISTS, JSON.stringify(lists))
  },

  getBatchJobs(): unknown[] {
    try {
      const stored = localStorage.getItem(KEYS.BATCH_JOBS)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  setBatchJobs(jobs: unknown[]): void {
    localStorage.setItem(KEYS.BATCH_JOBS, JSON.stringify(jobs))
  },
}

function defaultSettings(): GenerationSettings {
  return {
    platform: '네이버 블로그',
    contentType: 'info',
    wordCount: 2000,
    h2Count: 4,
    h3Count: 2,
    tone: 'professional',
    writingStyle: 'blog',
    keywordDensity: 1.5,
    includeLSI: true,
    includeFAQ: true,
    aeoOptimize: true,
    schemaAutoDetect: true,
    humanizationLevel: 'basic',
    burstinessVariation: true,
  }
}
