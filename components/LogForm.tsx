'use client'
import { useState, useRef, useTransition } from 'react'
import { logActivityAction } from '@/app/actions'
import type { Topic } from '@/lib/queries'

const PLATFORMS = ['Reddit', 'Quora', 'Dev.to', 'Medium', 'LinkedIn', 'Facebook', 'Instagram', 'Other']
const ACTIVITY_TYPES = ['Article', 'Post / Thread', 'Comment / Answer']

function detectPlatformClient(url: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase()
    if (h.includes('reddit.com')) return 'Reddit'
    if (h.includes('quora.com')) return 'Quora'
    if (h.includes('dev.to')) return 'Dev.to'
    if (h.includes('medium.com')) return 'Medium'
    if (h.includes('linkedin.com')) return 'LinkedIn'
    if (h.includes('facebook.com') || h.includes('fb.watch')) return 'Facebook'
    if (h.includes('instagram.com') || h.includes('instagr.am')) return 'Instagram'
  } catch {}
  return ''
}

function detectTypeClient(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('reddit.com') && lower.includes('/comments/')) {
    return lower.includes('?context') || /#[a-z0-9]+$/.test(lower)
      ? 'Comment / Answer' : 'Post / Thread'
  }
  if (lower.includes('quora.com/answer') || lower.includes('quora.com/profile')) return 'Comment / Answer'
  if (lower.includes('dev.to') || lower.includes('medium.com')) return 'Article'
  return ''
}

function extractSubredditClient(url: string): string {
  try {
    const match = url.match(/\/r\/([a-zA-Z0-9_]+)/i)
    if (match && match[1]) return `r/${match[1]}`
  } catch {}
  return ''
}

export default function LogForm({ topics }: { topics: Topic[] }) {
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState('')
  const [activityType, setActivityType] = useState('')
  const [subreddit, setSubreddit] = useState('')
  const [isPromotional, setIsPromotional] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim()
    if (!val) return
    const detectedPlatform = detectPlatformClient(val)
    const detectedType = detectTypeClient(val)
    const detectedSub = extractSubredditClient(val)

    if (detectedPlatform && !platform) setPlatform(detectedPlatform)
    if (detectedType && !activityType) setActivityType(detectedType)
    if (detectedSub && !subreddit) setSubreddit(detectedSub)
  }

  function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setScreenshotPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function toggleTopic(name: string) {
    setSelectedTopics(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) { setResult({ error: 'URL is required' }); return }
    if (!selectedTopics.length) { setResult({ error: 'Select at least one topic' }); return }

    const formData = new FormData(formRef.current!)
    formData.delete('topic_tags')
    selectedTopics.forEach(t => formData.append('topic_tags', t))
    formData.set('is_promotional', isPromotional ? '1' : '0')

    setResult(null)
    startTransition(async () => {
      const res = await logActivityAction(formData)
      setResult(res)
      if (res.success) {
        setUrl(''); setPlatform(''); setActivityType(''); setSubreddit('')
        setIsPromotional(false); setSelectedTopics([]); setScreenshotPreview(null)
        setDate(new Date().toISOString().split('T')[0])
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card space-y-5">
      {result?.success && <div className="alert-success">✅ Activity logged successfully!</div>}
      {result?.error && <div className="alert-error">⚠️ {result.error}</div>}

      {/* URL */}
      <div>
        <label className="label">Post / Comment URL *</label>
        <input
          name="url"
          type="url"
          className="input"
          placeholder="https://reddit.com/r/startups/comments/..."
          value={url}
          onChange={e => { setUrl(e.target.value); handleUrlBlur({ target: e.target } as any) }}
          onBlur={handleUrlBlur}
          required
        />
        {platform && (
          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
            <span>Auto-detected:</span>
            <span className="text-violet-400 font-medium">{platform}</span>
            {activityType && <>· <span className="text-violet-400 font-medium">{activityType}</span></>}
            {subreddit && <>· <span className="text-orange-400 font-medium">{subreddit}</span></>}
          </p>
        )}
      </div>

      {/* Platform + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Platform *</label>
          <select name="platform" className="select" value={platform} onChange={e => setPlatform(e.target.value)} required>
            <option value="">Select platform</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Activity Type *</label>
          <select name="activity_type" className="select" value={activityType} onChange={e => setActivityType(e.target.value)} required>
            <option value="">Select type</option>
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Subreddit (if Reddit) */}
      {(platform === 'Reddit' || subreddit) && (
        <div>
          <label className="label">Subreddit Name <span className="text-slate-500 normal-case font-normal">(e.g. r/startups, r/webdev)</span></label>
          <input
            name="subreddit"
            type="text"
            className="input"
            placeholder="r/startups"
            value={subreddit}
            onChange={e => setSubreddit(e.target.value)}
          />
        </div>
      )}

      {/* Promotional / Enacton Mention Toggle */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-200">Mentioned Enacton?</div>
          <div className="text-xs text-slate-500">Is this post/comment promotional (contains Enacton brand link/mention)?</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isPromotional}
            onChange={e => setIsPromotional(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {/* Topics */}
      <div>
        <label className="label">Topic Tags * <span className="text-slate-500 normal-case font-normal">(select all that apply)</span></label>
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
          {topics.map(topic => {
            const selected = selectedTopics.includes(topic.name)
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.name)}
                className="tag-pill cursor-pointer transition-all"
                style={{
                  background: selected ? topic.color + '30' : '#1e293b',
                  color: selected ? topic.color : '#64748b',
                  border: `1px solid ${selected ? topic.color + '60' : '#334155'}`,
                  fontWeight: selected ? '600' : '400',
                }}
              >
                {selected && '✓ '}{topic.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="label">Date Published *</label>
        <input
          name="date_posted"
          type="date"
          className="input"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          style={{ colorScheme: 'dark' }}
        />
      </div>

      {/* Divider */}
      <hr className="divider" />
      <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Optional Metadata</p>

      {/* Title */}
      <div>
        <label className="label">Title / Headline</label>
        <input name="title" type="text" className="input" placeholder="The post title or thread headline" />
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes / Comment Body Snippet</label>
        <textarea name="notes" className="input" placeholder="What did you comment or write in this post?" />
      </div>

      {/* Screenshot */}
      <div>
        <label className="label">Screenshot</label>
        <div
          className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors bg-slate-900/80"
          style={{ borderColor: screenshotPreview ? '#8b5cf6' : '#334155' }}
          onClick={() => document.getElementById('screenshot-input')?.click()}
        >
          {screenshotPreview ? (
            <img src={screenshotPreview} alt="Preview" className="max-h-40 mx-auto rounded" />
          ) : (
            <>
              <svg className="mx-auto mb-2 text-slate-600" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="text-sm text-slate-400">Drop screenshot here or click to upload</p>
              <p className="text-xs text-slate-600 mt-1">PNG, JPG, WEBP</p>
            </>
          )}
        </div>
        <input
          id="screenshot-input"
          name="screenshot"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleScreenshot}
        />
      </div>

      {/* Logged By */}
      <div>
        <label className="label">Logged By</label>
        <input name="logged_by" type="text" className="input" placeholder="Your name (e.g. Vrushank)" />
      </div>

      {/* Submit */}
      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={isPending}>
        {isPending ? 'Saving...' : '✓ Save Activity'}
      </button>
    </form>
  )
}
