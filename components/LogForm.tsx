'use client'
import { useState, useRef, useTransition } from 'react'
import { logActivityAction } from '@/app/actions'
import type { Topic } from '@/lib/queries'

const PLATFORMS = ['Reddit', 'Quora', 'Dev.to', 'Medium', 'LinkedIn', 'Other']
const ACTIVITY_TYPES = ['Article', 'Post / Thread', 'Comment / Answer']

function detectPlatformClient(url: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase()
    if (h.includes('reddit.com')) return 'Reddit'
    if (h.includes('quora.com')) return 'Quora'
    if (h.includes('dev.to')) return 'Dev.to'
    if (h.includes('medium.com')) return 'Medium'
    if (h.includes('linkedin.com')) return 'LinkedIn'
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

export default function LogForm({ topics }: { topics: Topic[] }) {
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState('')
  const [activityType, setActivityType] = useState('')
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
    if (detectedPlatform && !platform) setPlatform(detectedPlatform)
    if (detectedType && !activityType) setActivityType(detectedType)
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
    // Append selected topics
    formData.delete('topic_tags')
    selectedTopics.forEach(t => formData.append('topic_tags', t))

    setResult(null)
    startTransition(async () => {
      const res = await logActivityAction(formData)
      setResult(res)
      if (res.success) {
        setUrl(''); setPlatform(''); setActivityType('')
        setSelectedTopics([]); setScreenshotPreview(null)
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
        <label className="label">URL *</label>
        <input
          name="url"
          type="url"
          className="input"
          placeholder="https://reddit.com/r/startups/comments/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          onBlur={handleUrlBlur}
          required
        />
        {platform && (
          <p className="text-xs text-slate-500 mt-1">
            Auto-detected: <span className="text-violet-400">{platform}</span>
            {activityType && <> · <span className="text-violet-400">{activityType}</span></>}
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

      {/* Topics */}
      <div>
        <label className="label">Topic Tags * <span className="text-slate-600 normal-case font-normal">(select all that apply)</span></label>
        <div className="flex flex-wrap gap-2 p-3 rounded-lg" style={{ background: '#0f172a', border: '1px solid #334155' }}>
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
      <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider">Optional</p>

      {/* Title */}
      <div>
        <label className="label">Title / Headline</label>
        <input name="title" type="text" className="input" placeholder="The post title or thread headline" />
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" className="input" placeholder="e.g. Got 47 upvotes in first 2 hours, lots of engagement from founders" />
      </div>

      {/* Screenshot */}
      <div>
        <label className="label">Screenshot</label>
        <div
          className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors"
          style={{ borderColor: screenshotPreview ? '#8b5cf6' : '#334155', background: '#0f172a' }}
          onClick={() => document.getElementById('screenshot-input')?.click()}
        >
          {screenshotPreview ? (
            <img src={screenshotPreview} alt="Preview" className="max-h-40 mx-auto rounded" />
          ) : (
            <>
              <svg className="mx-auto mb-2 text-slate-600" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="text-sm text-slate-500">Drop screenshot here or click to upload</p>
              <p className="text-xs text-slate-700 mt-1">PNG, JPG, WEBP</p>
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
