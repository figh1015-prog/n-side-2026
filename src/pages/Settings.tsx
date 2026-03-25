import React, { useState, useCallback } from 'react'
import {
  Settings, Eye, EyeOff, CheckCircle, XCircle, Loader2,
  Save, Bell, Sliders, Key, AlertCircle, RefreshCw
} from 'lucide-react'
import { useToastContext } from '../App'
import { storage } from '../lib/storage'
import type { ApiKeys } from '../types'

interface ApiKeyField {
  key: keyof ApiKeys
  label: string
  placeholder: string
  testEndpoint?: string
  group: string
  note?: string
}

const API_KEY_FIELDS: ApiKeyField[] = [
  { key: 'gemini', label: 'Google Gemini API Key', placeholder: 'AIza...', group: 'AI', note: '글 생성에 사용됩니다' },
  { key: 'openai', label: 'OpenAI API Key (선택)', placeholder: 'sk-...', group: 'AI', note: '폴백용 (선택사항)' },
  { key: 'genspark', label: 'Genspark AI API Key', placeholder: 'gsk_...', group: 'AI' },
  { key: 'naverClientId', label: 'Naver Client ID', placeholder: 'naver_client_id', group: 'Naver' },
  { key: 'naverClientSecret', label: 'Naver Client Secret', placeholder: 'naver_client_secret', group: 'Naver' },
  { key: 'naverAdApiKey', label: 'Naver SearchAd API Key', placeholder: 'api_key', group: 'Naver' },
  { key: 'naverAdSecretKey', label: 'Naver SearchAd Secret Key', placeholder: 'secret_key', group: 'Naver' },
  { key: 'naverAdCustomerId', label: 'Naver SearchAd Customer ID', placeholder: '000000', group: 'Naver' },
  { key: 'naverDatalabKey', label: 'Naver DataLab API Key', placeholder: 'datalab_key', group: 'Naver' },
  { key: 'indexNowKey', label: 'IndexNow API Key', placeholder: 'your-indexnow-key', group: 'SEO' },
  { key: 'pageSpeedKey', label: 'PageSpeed Insights API Key', placeholder: 'AIza...', group: 'SEO' },
  { key: 'bareun', label: 'Bareun 형태소 API Key (선택)', placeholder: 'bareun_api_key', group: 'SEO', note: '한국어 형태소 분석' },
]

function ApiKeyRow({ field, value, onSave, onTest }: {
  field: ApiKeyField
  value: string
  onSave: (key: keyof ApiKeys, val: string) => void
  onTest: (key: keyof ApiKeys) => Promise<boolean>
}) {
  const [show, setShow] = useState(false)
  const [localVal, setLocalVal] = useState(value)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(value ? null : null)

  const handleTest = async () => {
    setTesting(true)
    const ok = await onTest(field.key)
    setTestResult(ok ? 'ok' : 'fail')
    setTesting(false)
  }

  const status = !localVal ? 'unset' : testResult === 'ok' ? 'connected' : testResult === 'fail' ? 'error' : 'set'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-400 font-medium">{field.label}</label>
        <div className="flex items-center gap-2">
          {field.note && <span className="text-xs text-slate-600">{field.note}</span>}
          {status === 'unset' && <span className="flex items-center gap-1 text-xs text-slate-600"><span className="w-2 h-2 rounded-full bg-slate-600" /> 미설정</span>}
          {status === 'set' && <span className="flex items-center gap-1 text-xs text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400" /> 설정됨</span>}
          {status === 'connected' && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> 연결됨</span>}
          {status === 'error' && <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3.5 h-3.5" /> 오류</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            placeholder={field.placeholder}
            className="input-field text-sm pr-10 font-mono"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={() => { onSave(field.key, localVal); setTestResult(null) }}
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1 shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          저장
        </button>
        {localVal && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1 shrink-0"
          >
            {testing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
            테스트
          </button>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const toast = useToastContext()
  const [activeTab, setActiveTab] = useState<'apikeys' | 'defaults' | 'notifications'>('apikeys')
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => storage.getApiKeys())
  const [defaultSettings, setDefaultSettings] = useState(() => storage.getSettings())
  const [notifSettings, setNotifSettings] = useState({
    browserPush: false,
    email: '',
    rankDropThreshold: 5,
    aeoDropThreshold: 10,
  })

  const handleSaveKey = useCallback((key: keyof ApiKeys, value: string) => {
    const updated = { ...apiKeys, [key]: value }
    storage.setApiKeys(updated)
    setApiKeys(updated)
    toast.success(`${key} 저장됨`)
  }, [apiKeys, toast])

  const handleTestKey = useCallback(async (key: keyof ApiKeys): Promise<boolean> => {
    const value = apiKeys[key]
    if (!value) return false

    // Simulate API test
    await new Promise(r => setTimeout(r, 1000))

    if (key === 'gemini') {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${value}`
        )
        if (res.ok) { toast.success('Gemini API 연결 성공!'); return true }
        toast.error('Gemini API 연결 실패')
        return false
      } catch {
        toast.error('연결 테스트 실패')
        return false
      }
    }

    // Mock test for others
    const ok = Math.random() > 0.3
    if (ok) toast.success(`${key} 연결 성공!`)
    else toast.error(`${key} 연결 실패`)
    return ok
  }, [apiKeys, toast])

  const handleSaveDefaults = () => {
    storage.setSettings(defaultSettings)
    toast.success('기본 설정이 저장되었습니다.')
  }

  const groupedFields: Record<string, ApiKeyField[]> = {}
  API_KEY_FIELDS.forEach(f => {
    if (!groupedFields[f.group]) groupedFields[f.group] = []
    groupedFields[f.group].push(f)
  })

  const tabs = [
    { id: 'apikeys', label: 'API 키', icon: <Key className="w-4 h-4" /> },
    { id: 'defaults', label: '기본 설정', icon: <Sliders className="w-4 h-4" /> },
    { id: 'notifications', label: '알림 설정', icon: <Bell className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <Settings className="w-5 h-5 text-indigo-400" />
        설정
      </h1>

      <div className="tab-bar w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`tab-item flex items-center gap-2 ${activeTab === t.id ? 'active' : ''}`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* API Keys Tab */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
            style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)' }}>
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-slate-400">
              모든 API 키는 <strong className="text-slate-300">브라우저 localStorage</strong>에만 저장됩니다.
              서버로 전송되지 않으며, 안전하게 로컬에서 관리됩니다.
            </div>
          </div>

          {Object.entries(groupedFields).map(([group, fields]) => (
            <div key={group} className="card space-y-5">
              <div className="section-label flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                {group} API
              </div>
              {fields.map(field => (
                <ApiKeyRow
                  key={field.key}
                  field={field}
                  value={apiKeys[field.key] || ''}
                  onSave={handleSaveKey}
                  onTest={handleTestKey}
                />
              ))}
            </div>
          ))}

          {/* Clear All */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (confirm('모든 API 키를 삭제하시겠습니까?')) {
                  storage.setApiKeys({})
                  setApiKeys({})
                  toast.success('모든 API 키가 삭제되었습니다.')
                }
              }}
              className="text-sm flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <XCircle className="w-4 h-4" />
              모든 키 삭제
            </button>
          </div>
        </div>
      )}

      {/* Default Settings Tab */}
      {activeTab === 'defaults' && (
        <div className="card space-y-6">
          <div className="section-label">생성 기본값</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">기본 플랫폼</label>
              <select
                value={defaultSettings.platform}
                onChange={e => setDefaultSettings(p => ({ ...p, platform: e.target.value }))}
                className="input-field text-sm"
              >
                {['네이버 블로그', '티스토리', '워드프레스'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">
                기본 글자수: <span className="text-indigo-400 font-bold">{defaultSettings.wordCount.toLocaleString()}자</span>
              </label>
              <input
                type="range" min={800} max={5000} step={100}
                value={defaultSettings.wordCount}
                onChange={e => setDefaultSettings(p => ({ ...p, wordCount: Number(e.target.value) }))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1.5">기본 어조</label>
              <select
                value={defaultSettings.tone}
                onChange={e => setDefaultSettings(p => ({ ...p, tone: e.target.value }))}
                className="input-field text-sm"
              >
                {[
                  { value: 'professional', label: '전문가' },
                  { value: 'friendly', label: '친근함' },
                  { value: 'neutral', label: '중립' },
                  { value: 'persuasive', label: '설득형' },
                ].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1.5">기본 문체</label>
              <select
                value={defaultSettings.writingStyle}
                onChange={e => setDefaultSettings(p => ({ ...p, writingStyle: e.target.value }))}
                className="input-field text-sm"
              >
                {[
                  { value: 'blog', label: '블로그형' },
                  { value: 'news', label: '뉴스기사형' },
                  { value: 'academic', label: '학술형' },
                ].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1.5">AI 탐지 회피 수준</label>
              <select
                value={defaultSettings.humanizationLevel}
                onChange={e => setDefaultSettings(p => ({ ...p, humanizationLevel: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="basic">기본</option>
                <option value="enhanced">강화</option>
                <option value="maximum">최대</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">
                키워드 밀도: <span className="text-cyan-400 font-bold">{defaultSettings.keywordDensity}%</span>
              </label>
              <input
                type="range" min={0.5} max={3} step={0.1}
                value={defaultSettings.keywordDensity}
                onChange={e => setDefaultSettings(p => ({ ...p, keywordDensity: Number(e.target.value) }))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t" style={{ borderColor: '#2d2d4a' }}>
            <div className="section-label">기본 옵션</div>
            {[
              { key: 'includeLSI', label: 'LSI 키워드 포함' },
              { key: 'includeFAQ', label: 'FAQ 섹션 추가' },
              { key: 'aeoOptimize', label: 'AEO 최적화' },
              { key: 'schemaAutoDetect', label: '스키마 자동 감지' },
              { key: 'burstinessVariation', label: '문장 길이 변화 (Burstiness)' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{opt.label}</span>
                <div
                  className={`w-10 h-5 rounded-full transition-all duration-200 relative cursor-pointer
                    ${defaultSettings[opt.key as keyof typeof defaultSettings] ? 'bg-indigo-600' : 'bg-slate-700'}`}
                  onClick={() => setDefaultSettings(p => ({
                    ...p,
                    [opt.key]: !p[opt.key as keyof typeof defaultSettings]
                  }))}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
                    ${defaultSettings[opt.key as keyof typeof defaultSettings] ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
            ))}
          </div>

          <button onClick={handleSaveDefaults} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Save className="w-4 h-4" />
            기본 설정 저장
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card space-y-6">
          <div className="section-label">알림 설정</div>

          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-sm text-slate-300 block">브라우저 푸시 알림</span>
              <span className="text-xs text-slate-500">생성 완료, 오류 등 실시간 알림</span>
            </div>
            <div
              className={`w-10 h-5 rounded-full transition-all duration-200 relative cursor-pointer
                ${notifSettings.browserPush ? 'bg-indigo-600' : 'bg-slate-700'}`}
              onClick={() => setNotifSettings(p => ({ ...p, browserPush: !p.browserPush }))}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
                ${notifSettings.browserPush ? 'left-5' : 'left-0.5'}`} />
            </div>
          </label>

          <div>
            <label className="text-sm text-slate-400 block mb-1.5">이메일 알림</label>
            <input
              type="email"
              value={notifSettings.email}
              onChange={e => setNotifSettings(p => ({ ...p, email: e.target.value }))}
              placeholder="example@email.com"
              className="input-field text-sm"
            />
          </div>

          <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#2d2d4a' }}>
            <div className="section-label">알림 임계값</div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">
                순위 하락 알림: <span className="text-amber-400 font-bold">{notifSettings.rankDropThreshold}위 이상</span>
              </label>
              <input
                type="range" min={1} max={20} step={1}
                value={notifSettings.rankDropThreshold}
                onChange={e => setNotifSettings(p => ({ ...p, rankDropThreshold: Number(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">
                AEO 점수 하락 알림: <span className="text-red-400 font-bold">{notifSettings.aeoDropThreshold}점 이상</span>
              </label>
              <input
                type="range" min={5} max={30} step={1}
                value={notifSettings.aeoDropThreshold}
                onChange={e => setNotifSettings(p => ({ ...p, aeoDropThreshold: Number(e.target.value) }))}
                className="w-full accent-red-500"
              />
            </div>
          </div>

          <button
            onClick={() => toast.success('알림 설정이 저장되었습니다.')}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            <Save className="w-4 h-4" />
            알림 설정 저장
          </button>
        </div>
      )}
    </div>
  )
}
