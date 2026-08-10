'use client'
import { useState, useRef, useEffect, useTransition } from 'react'
import { deleteActivityAction, updateActivityAction } from '@/app/actions'
import type { Activity, Topic } from '@/lib/queries'

const PLATFORMS = ['Reddit', 'Quora', 'Dev.to', 'Medium', 'LinkedIn', 'Facebook', 'Instagram', 'Other']
const ACTIVITY_TYPES = ['Article', 'Post / Thread', 'Comment / Answer']

export default function ActivityRowActions({
  activity,
  topics,
}: {
  activity: Activity
  topics: Topic[]
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  // Edit state
  const [url, setUrl] = useState(activity.url)
  const [platform, setPlatform] = useState(activity.platform)
  const [activityType, setActivityType] = useState(activity.activity_type)
  const [subreddit, setSubreddit] = useState(activity.subreddit || '')
  const [isPromotional, setIsPromotional] = useState(activity.is_promotional === 1)
  const [datePosted, setDatePosted] = useState(activity.date_posted)
  const [title, setTitle] = useState(activity.title || '')
  const [notes, setNotes] = useState(activity.notes || '')
  const [loggedBy, setLoggedBy] = useState(activity.logged_by || '')
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
    try { return JSON.parse(activity.topic_tags || '[]') } catch { return [] }
  })
  const [editError, setEditError] = useState<string | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleDelete() {
    setMenuOpen(false)
    if (!confirm('Are you sure you want to delete this activity?')) return
    startTransition(async () => {
      await deleteActivityAction(activity.id)
    })
  }

  function toggleTopic(name: string) {
    setSelectedTopics(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    )
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setEditError(null)

    const formData = new FormData()
    formData.set('id', activity.id)
    formData.set('url', url)
    formData.set('platform', platform)
    formData.set('activity_type', activityType)
    formData.set('subreddit', subreddit)
    formData.set('is_promotional', isPromotional ? '1' : '0')
    formData.set('date_posted', datePosted)
    formData.set('title', title)
    formData.set('notes', notes)
    formData.set('logged_by', loggedBy)
    selectedTopics.forEach(t => formData.append('topic_tags', t))

    startTransition(async () => {
      const res = await updateActivityAction(formData)
      if (res.success) {
        setEditOpen(false)
      } else {
        setEditError(res.error || 'Failed to update activity')
      }
    })
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Three dots button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        title="Actions"
      >
        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="12" cy="19" r="2.2" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 top-8 z-50 w-36 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1">
          <button
            onClick={() => { setMenuOpen(false); setEditOpen(true) }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>✏️</span> Edit Activity
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>🗑️</span> Delete
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 text-left border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">Edit Activity</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && <div className="alert-error">⚠️ {editError}</div>}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* URL */}
              <div>
                <label className="label">Post / Comment URL *</label>
                <input
                  type="url"
                  className="input"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  required
                />
              </div>

              {/* Platform + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Platform *</label>
                  <select className="select" value={platform} onChange={e => setPlatform(e.target.value as any)} required>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Activity Type *</label>
                  <select className="select" value={activityType} onChange={e => setActivityType(e.target.value as any)} required>
                    {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Subreddit */}
              {platform === 'Reddit' && (
                <div>
                  <label className="label">Subreddit Name</label>
                  <input
                    type="text"
                    className="input"
                    value={subreddit}
                    onChange={e => setSubreddit(e.target.value)}
                    placeholder="r/startups"
                  />
                </div>
              )}

              {/* Promotional Toggle */}
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Mentioned Enacton?</div>
                  <div className="text-xs text-slate-500">Is this post promotional?</div>
                </div>
                <input
                  type="checkbox"
                  checked={isPromotional}
                  onChange={e => setIsPromotional(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Topics */}
              <div>
                <label className="label">Topic Tags *</label>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  {topics.map(topic => {
                    const selected = selectedTopics.includes(topic.name)
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.name)}
                        className="tag-pill text-xs cursor-pointer transition-all"
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
                  type="date"
                  className="input"
                  value={datePosted}
                  onChange={e => setDatePosted(e.target.value)}
                  required
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Title */}
              <div>
                <label className="label">Title / Headline</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes / Comment Body Snippet</label>
                <textarea
                  className="input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Logged By */}
              <div>
                <label className="label">Logged By</label>
                <input
                  type="text"
                  className="input"
                  value={loggedBy}
                  onChange={e => setLoggedBy(e.target.value)}
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
