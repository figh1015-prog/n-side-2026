export interface Article {
  id: string
  keyword: string
  platform: string
  content?: string
  html_content?: string
  schema_json?: string
  word_count: number
  aeo_score: number
  readability_score?: number
  status: 'draft' | 'published' | 'scheduled' | 'error'
  created_at: string
  published_at?: string
  updated_at?: string
}

export interface Keyword {
  id: string
  keyword: string
  list_name?: string
  monthly_volume?: number
  competition?: number
  saturation_score?: number
  difficulty?: string
  last_analyzed?: string
  created_at: string
}

export interface Schedule {
  id: string
  article_id: string
  platform: string
  scheduled_at: string
  status: 'pending' | 'published' | 'failed'
  created_at: string
  keyword?: string
  word_count?: number
  aeo_score?: number
}

export interface RankTracking {
  id: string
  keyword: string
  naver_rank?: number
  google_rank?: number
  checked_at: string
}

export interface IndexingLog {
  id: string
  url: string
  service: string
  status: string
  submitted_at: string
}

export interface GenerationSettings {
  platform: string
  contentType: string
  wordCount: number
  h2Count: number
  h3Count: number
  tone: string
  writingStyle: string
  keywordDensity: number
  includeLSI: boolean
  includeFAQ: boolean
  aeoOptimize: boolean
  schemaAutoDetect: boolean
  humanizationLevel: string
  burstinessVariation: boolean
}

export interface AEOBreakdown {
  questionHeadings: boolean
  answerInTop30: boolean
  tableOfContents: boolean
  faqSection: boolean
  statistics: boolean
  trustSignals: boolean
  conversationalTone: boolean
  entityMentions: boolean
}

export interface BatchJob {
  id: string
  keywords: string[]
  settings: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'cancelled'
  progress: number
  results: Array<{
    keyword: string
    status: string
    articleId?: string
    aeoScore?: number
    error?: string
    content?: string
  }>
  createdAt: string
}

export interface ApiKeys {
  gemini?: string
  openai?: string
  naverClientId?: string
  naverClientSecret?: string
  naverAdApiKey?: string
  naverAdSecretKey?: string
  naverAdCustomerId?: string
  naverDatalabKey?: string
  indexNowKey?: string
  pageSpeedKey?: string
  genspark?: string
  bareun?: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}
