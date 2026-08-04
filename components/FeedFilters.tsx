'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Topic } from '@/lib/queries'

const PLATFORMS = ['Reddit', 'Quora', 'Dev.to', 'Medium', 'LinkedIn', 'Other']

export default function FeedFilters({ topics }: { topics: Topic[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const platform = searchParams.get('platform') || 'all'
  const topic = searchParams.get('topic') || 'all'

  function updateFilter(newPlatform: string, newTopic: string) {
    const params = new URLSearchParams()
    if (newPlatform && newPlatform !== 'all') params.set('platform', newPlatform)
    if (newTopic && newTopic !== 'all') params.set('topic', newTopic)
    const query = params.toString()
    router.push(query ? `/feed?${query}` : '/feed')
  }

  return (
    <div className="flex gap-3 mb-6 items-center">
      <select
        className="select"
        style={{ width: '160px' }}
        value={platform}
        onChange={(e) => updateFilter(e.target.value, topic)}
      >
        <option value="all">All Platforms</option>
        {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <select
        className="select"
        style={{ width: '220px' }}
        value={topic}
        onChange={(e) => updateFilter(platform, e.target.value)}
      >
        <option value="all">All Topics</option>
        {topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
      </select>

      {(platform !== 'all' || topic !== 'all') && (
        <button
          onClick={() => updateFilter('all', 'all')}
          className="btn-secondary flex items-center gap-1 text-sm py-2 px-3"
        >
          ✕ Clear
        </button>
      )}
    </div>
  )
}
