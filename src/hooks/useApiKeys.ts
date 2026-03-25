import { useState, useCallback } from 'react'
import { storage } from '../lib/storage'
import type { ApiKeys } from '../types'

export function useApiKeys() {
  const [apiKeys, setApiKeysState] = useState<ApiKeys>(() => storage.getApiKeys())

  const setApiKeys = useCallback((keys: ApiKeys) => {
    storage.setApiKeys(keys)
    setApiKeysState(keys)
  }, [])

  const updateApiKey = useCallback((key: keyof ApiKeys, value: string) => {
    const updated = { ...apiKeys, [key]: value }
    storage.setApiKeys(updated)
    setApiKeysState(updated)
  }, [apiKeys])

  const hasGeminiKey = Boolean(apiKeys.gemini)
  const hasNaverKey = Boolean(apiKeys.naverClientId && apiKeys.naverClientSecret)

  return { apiKeys, setApiKeys, updateApiKey, hasGeminiKey, hasNaverKey }
}
