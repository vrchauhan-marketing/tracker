'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Topic } from '@/lib/queries'

const PLATFORMS = ['Reddit', 'Quora', 'Dev.to', 'Medium', 'LinkedIn', 'Facebook', 'Instagram', 'Other']

export default function FeedFilters({ topics }: { topics: Topic[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const platform = searchParams.get('platform') || 'all'
  const topic = searchParams.get('topic') || 'all'
  const promotional = searchParams.get('promotional') || 'all'

  function updateFilter(newPlatform: string, newTopic: string, newPromotional: string) {
    const params = new URLSearchParams()
    if (newPlatform && newPlatform !== 'all') params.set('platform', newPlatform)
    if (newTopic && newTopic !== 'all') params.set('topic', newTopic)
    if (newPromotional && newPromotional !== 'all') params.set('promotional', newPromotional)
    const query = params.toString()
    router.push(query ? `/feed?${query}` : '/feed')
  }

  const isFiltered = platform !== 'all' || topic !== 'all' || promotional !== 'all'

  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      {/* Platform Filter */}
      <select
        className="select"
        style={{ width: '160px' }}
        value={platform}
        onChange={(e) => updateFilter(e.target.value, topic, promotional)}
      >
        <option value="all">All Platforms</option>
        {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* Topic Filter */}
      <select
        className="select"
        style={{ width: '200px' }}
        value={topic}
        onChange={(e) => updateFilter(platform, e.target.value, promotional)}
      >
        <option value="all">All Topics</option>
        {topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
      </select>

      {/* Promotional Filter */}
      <select
        className="select"
        style={{ width: '180px' }}
        value={promotional}
        onChange={(e) => updateFilter(platform, topic, e.target.value)}
      >
        <option value="all">All Post Types</option>
        <option value="yes">🟢 Mentioned Enacton</option>
        <option value="no">⚪ No Mention (Organic)</option>
      </select>

      {/* Clear Button */}
      {isFiltered && (
        <button
          onClick={() => updateFilter('all', 'all', 'all')}
          className="btn-secondary flex items-center gap-1 text-sm py-2 px-3"
        >
          ✕ Clear Filters
        </button>
      )}
    </div>
  )
}
